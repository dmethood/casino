import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serverRNG } from '@/lib/casino/rng';
import { contactRateLimit } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';
import { jurisdictionEngine } from '@/lib/compliance/jurisdiction';
import { kycAMLSystem } from '@/lib/compliance/kyc-aml';

const betSchema = z.object({
  game: z.enum(['VEGETABLES', 'DICE', 'SLOTS', 'CRASH', 'DRAGON_TIGER', 'WHEEL', 'HORSE_RACING']),
  stake: z.number().int().min(100).max(1000000), // $1 to $10,000 in cents
  selection: z.record(z.any()), // Game-specific selection data
  provablyFair: z.object({
    clientSeed: z.string().min(8),
    nonce: z.number().int().min(0)
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication required for real money betting
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Apply rate limiting (stricter for real money)
    const rateLimitResult = contactRateLimit(request);
    if (!rateLimitResult.success) {
      logger.warn('Casino bet rate limit exceeded', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = betSchema.parse(body);

    // Get user with all compliance data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        wallet: true,
        kycProfile: true,
        rgProfile: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Compliance checks
    
    // 1. KYC verification required for real money
    if (!user.kycProfile?.approved) {
      return NextResponse.json({ 
        error: 'KYC verification required for real money betting',
        redirectTo: '/kyc/verify'
      }, { status: 403 });
    }

    // 2. Check responsible gambling status
    if (user.rgProfile?.status === 'SELF_EXCLUDED' || 
        (user.rgProfile?.selfExcludedUntil && new Date(user.rgProfile.selfExcludedUntil) > new Date())) {
      return NextResponse.json({ 
        error: 'Account is self-excluded',
        redirectTo: '/responsible-gambling/blocked'
      }, { status: 403 });
    }

    if (user.rgProfile?.status === 'COOLING_OFF' || 
        (user.rgProfile?.coolingOffUntil && new Date(user.rgProfile.coolingOffUntil) > new Date())) {
      return NextResponse.json({ 
        error: 'Account is in cooling-off period',
        redirectTo: '/responsible-gambling/cooling-off'
      }, { status: 403 });
    }

    // 3. Check jurisdiction compliance
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const geoValidation = await jurisdictionEngine.validateJurisdiction(
      clientIP, 
      user.kycProfile.jurisdiction
    );

    if (!geoValidation.isValid) {
      return NextResponse.json({ 
        error: 'Gaming not available in your location',
        redirectTo: '/blocked'
      }, { status: 403 });
    }

    // 4. Check if specific game is allowed in jurisdiction
    const gameAllowed = jurisdictionEngine.isGameAllowedInJurisdiction(
      user.kycProfile.jurisdiction, 
      validatedData.game
    );

    if (!gameAllowed) {
      return NextResponse.json({ 
        error: `${validatedData.game} not available in ${user.kycProfile.jurisdiction}` 
      }, { status: 403 });
    }

    // 5. Validate bet amount against limits
    const betValidation = await validateBetAmount(user, validatedData.stake);
    if (!betValidation.valid) {
      return NextResponse.json({ error: betValidation.error }, { status: 400 });
    }

    // 6. Check wallet balance
    if (!user.wallet || user.wallet.balance * 100 < validatedData.stake) {
      return NextResponse.json({ 
        error: 'Insufficient funds',
        redirectTo: '/casino/deposit'
      }, { status: 400 });
    }

    logger.info('Processing real money casino bet', {
      userId: session.user.id,
      game: validatedData.game,
      stake: validatedData.stake,
      jurisdiction: user.kycProfile.jurisdiction,
      tier: user.kycProfile.tier
    });

    // Create provably fair commit
    const clientSeed = validatedData.provablyFair?.clientSeed ||
                      randomBytes(16).toString('hex');
    const nonce = validatedData.provablyFair?.nonce || 
                  await getNextNonce(session.user.id);
    
    const commit = serverRNG.createCommit(clientSeed);

    // Create game round with jurisdiction tracking
    const gameRound = await prisma.gameRound.create({
      data: {
        game: validatedData.game,
        state: 'OPEN',
        serverSeed: null, // Will be revealed after settlement
        serverSeedHash: commit.serverSeedHash,
        clientSeed: commit.clientSeed,
        nonce: nonce,
        rngProvider: process.env.RNG_CERT_REF || 'GLI-19',
        rtpTarget: 96.00, // 96% RTP target
        resultJson: JSON.stringify({}),
        jurisdiction: user.kycProfile.jurisdiction
      },
    });

    // Deduct stake from wallet and create transaction
    await prisma.$transaction(async (tx) => {
      // Deduct funds from wallet
      await tx.wallet.update({
        where: { id: user.wallet!.id },
        data: {
          balance: { decrement: validatedData.stake / 100 },
          lastTransaction: new Date()
        }
      });

      // Record wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: user.wallet!.id,
          amount: -(validatedData.stake / 100),
          type: 'BET_STAKE',
          reason: `${validatedData.game} bet stake`,
          referenceId: gameRound.id,
          balanceBefore: user.wallet!.balance,
          balanceAfter: user.wallet!.balance - (validatedData.stake / 100)
        }
      });

      // Create bet record
      await tx.bet.create({
        data: {
          roundId: gameRound.id,
          walletId: user.wallet!.id,
          stake: validatedData.stake / 100, // Store as decimal
          selection: JSON.stringify(validatedData.selection),
          status: 'PENDING',
          jurisdiction: user.kycProfile?.jurisdiction || 'DEFAULT'
        },
      });
    });

    // Monitor transaction for AML compliance
    await kycAMLSystem.monitorTransactionPattern(session.user.id, {
      amount: validatedData.stake,
      type: 'WAGER',
      timestamp: new Date(),
      paymentMethod: 'WALLET_FUNDS'
    });

    // Update gaming session
    await updateGamingSession(user.rgProfile?.id, validatedData.stake);

    logger.info('Real money casino bet placed successfully', {
      userId: session.user.id,
      roundId: gameRound.id,
      game: validatedData.game,
      stake: validatedData.stake,
      jurisdiction: user.kycProfile.jurisdiction
    });

    // Return bet confirmation
    return NextResponse.json({
      success: true,
      roundId: gameRound.id,
      provablyFair: {
        serverSeedHash: commit.serverSeedHash,
        clientSeed: commit.clientSeed,
        nonce: nonce,
        timestamp: Date.now()
      },
      wallet: {
        balance: user.wallet.balance - (validatedData.stake / 100),
        formatted: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(user.wallet.balance - (validatedData.stake / 100))
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Casino bet validation failed', { 
        errors: error.errors 
      });
      return NextResponse.json(
        { 
          error: 'Invalid bet data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Casino bet processing failed', { 
      error 
    });
    return NextResponse.json(
      { error: 'Bet processing failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

// Helper functions

async function validateBetAmount(user: any, stakeInCents: number): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check KYC tier limits
  const tierLimits = {
    'TIER_1': { maxBet: 100000, minBet: 100 }, // $1000 max, $1 min
    'TIER_2': { maxBet: 500000, minBet: 100 }, // $5000 max, $1 min
    'TIER_3': { maxBet: 1000000, minBet: 100 } // $10000 max, $1 min
  };

  const limits = tierLimits[user.kycProfile.tier as keyof typeof tierLimits] || tierLimits['TIER_1'];

  if (stakeInCents < limits.minBet) {
    return {
      valid: false,
      error: `Minimum bet is $${(limits.minBet / 100).toFixed(2)}`
    };
  }

  if (stakeInCents > limits.maxBet) {
    return {
      valid: false,
      error: `Maximum bet is $${(limits.maxBet / 100).toFixed(2)} for your verification tier`
    };
  }

  // Check responsible gambling limits
  if (user.rgProfile?.dailyLossLimit) {
    const dailyLossLimitCents = user.rgProfile.dailyLossLimit * 100;
    
    // Get today's losses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLosses = await prisma.walletTransaction.aggregate({
      where: {
        walletId: user.wallet.id,
        type: 'BET_STAKE',
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    });

    const todayLossesAmount = Math.abs((todayLosses._sum.amount || 0) * 100);
    
    if (todayLossesAmount + stakeInCents > dailyLossLimitCents) {
      return {
        valid: false,
        error: 'This bet would exceed your daily loss limit'
      };
    }
  }

  // Check jurisdiction-specific limits
  const jurisdictionRestrictions = jurisdictionEngine.getJurisdictionRestrictions(
    user.kycProfile.jurisdiction
  );
  
  if (jurisdictionRestrictions?.maxBetAmount && stakeInCents > jurisdictionRestrictions.maxBetAmount) {
    return {
      valid: false,
      error: `Maximum bet in ${user.kycProfile.jurisdiction} is $${(jurisdictionRestrictions.maxBetAmount / 100).toFixed(2)}`
    };
  }

  return { valid: true };
}

async function getNextNonce(userId: string): Promise<number> {
  try {
    // Get the latest game round for this user
    const latestRound = await prisma.gameRound.findFirst({
      where: {
        bets: {
          some: {
            wallet: { userId }
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      select: { nonce: true }
    });

    return (latestRound?.nonce || 0) + 1;
  } catch (error) {
    logger.error('Failed to get next nonce', { userId, error });
    return 1;
  }
}

async function updateGamingSession(rgProfileId: string | undefined, stakeInCents: number): Promise<void> {
  if (!rgProfileId) return;

  try {
    // Get or create active gaming session
    let activeSession = await prisma.gamingSession.findFirst({
      where: {
        rgProfileId,
        endedAt: null
      }
    });

    if (!activeSession) {
      // Create new session
      activeSession = await prisma.gamingSession.create({
        data: {
          rgProfileId,
          startedAt: new Date(),
          totalStaked: stakeInCents / 100,
          gamesPlayed: 1,
          ipAddress: 'client-ip' // Would get from request
        }
      });
    } else {
      // Update existing session
      await prisma.gamingSession.update({
        where: { id: activeSession.id },
        data: {
          totalStaked: { increment: stakeInCents / 100 },
          gamesPlayed: { increment: 1 }
        }
      });
    }

  } catch (error) {
    logger.error('Failed to update gaming session', { rgProfileId, error });
  }
}
