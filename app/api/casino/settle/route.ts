import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serverRNG } from '@/lib/casino/rng';
import { logger } from '@/lib/logger';

// Import game engines
import { settleCrashBet } from '@/lib/casino/engines/crash';
import { settleDiceBet } from '@/lib/casino/engines/dice';
import { settleVegetablesBet } from '@/lib/casino/engines/vegetables';
import { settleSlotsBet } from '@/lib/casino/engines/slots';

const settleSchema = z.object({
  roundId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication required for real money settlements
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { roundId } = settleSchema.parse(body);

    // Get round with bets and user data
    const round = await prisma.gameRound.findUnique({
      where: { id: roundId },
      include: {
        bets: {
          include: {
            wallet: {
              include: {
                user: {
                  include: {
                    kycProfile: true,
                    rgProfile: true
                  }
                }
              }
            }
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (round.state !== 'OPEN') {
      return NextResponse.json({ error: 'Round already settled' }, { status: 400 });
    }

    // Verify user owns this round
    const userBet = round.bets.find(bet => bet.wallet.user.id === session.user.id);
    if (!userBet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = userBet.wallet.user;

    // Final compliance checks before settlement
    if (!user.kycProfile?.approved) {
      return NextResponse.json({ error: 'KYC verification required' }, { status: 403 });
    }

    logger.info('Settling real money casino round', {
      roundId,
      userId: session.user.id,
      game: round.game,
      stake: userBet.stake,
      jurisdiction: user.kycProfile.jurisdiction
    });

    // Generate seed pack for this round using stored seeds
    const seedPack = {
      serverSeed: serverRNG.rotateServerSeed(), // Reveal server seed
      serverSeedHash: round.serverSeedHash!,
      clientSeed: round.clientSeed!,
      nonce: round.nonce
    };

    // Settle based on game type with real money calculations
    let outcome: any;
    const houseEdge = parseFloat(process.env.HOUSE_EDGE_DEFAULT || '0.04');
    
    switch (round.game) {
      case 'CRASH':
        outcome = await settleCrashBet({
          selection: userBet.selection as any,
          stake: userBet.stake * 100, // Convert to cents
          seedPack,
          houseEdge,
          jurisdiction: user.kycProfile.jurisdiction
        });
        break;

      case 'DICE':
        outcome = await settleDiceBet({
          selection: userBet.selection as any,
          stake: userBet.stake * 100,
          seedPack,
          houseEdge
        });
        break;

      case 'VEGETABLES':
        outcome = await settleVegetablesBet({
          selection: userBet.selection as any,
          stake: userBet.stake * 100,
          seedPack,
          houseEdge
        });
        break;

      case 'SLOTS':
        outcome = await settleSlotsBet({
          selection: (userBet.selection || {}) as any,
          stake: userBet.stake * 100,
          seedPack,
          houseEdge
        });
        break;

      default:
        throw new Error(`Game type ${round.game} not implemented for real money`);
    }

    // Process settlement in transaction
    const settlementResult = await prisma.$transaction(async (tx) => {
      // Update bet with result
      const updatedBet = await tx.bet.update({
        where: { id: userBet.id },
        data: {
          payout: outcome.payout / 100, // Convert cents to decimal
          status: outcome.won ? 'WON' : 'LOST',
          settledAt: new Date()
        },
      });

      // Process payout if won
      if (outcome.won && outcome.payout > 0) {
        // Add winnings to wallet
        await tx.wallet.update({
          where: { id: userBet.walletId },
          data: {
            balance: { increment: outcome.payout / 100 },
            lastTransaction: new Date()
          }
        });

        // Record payout transaction
        await tx.walletTransaction.create({
          data: {
            walletId: userBet.walletId,
            amount: outcome.payout / 100,
            type: 'BET_PAYOUT',
            reason: `${round.game} bet payout`,
            referenceId: roundId,
            balanceBefore: userBet.wallet.balance,
            balanceAfter: userBet.wallet.balance + (outcome.payout / 100)
          }
        });
      }

      // Update gaming session
      if (user.rgProfile) {
        const activeSession = await tx.gamingSession.findFirst({
          where: {
            rgProfileId: user.rgProfile.id,
            endedAt: null
          }
        });

        if (activeSession) {
          await tx.gamingSession.update({
            where: { id: activeSession.id },
            data: {
              totalWon: { increment: outcome.won ? outcome.payout / 100 : 0 },
              netResult: { 
                increment: outcome.won ? 
                  (outcome.payout / 100) - userBet.stake : 
                  -userBet.stake 
              }
            }
          });
        }
      }

      // Create reveal for provably fair
      const reveal = serverRNG.createReveal(seedPack, outcome.result);

      // Update round as settled
      const settledRound = await tx.gameRound.update({
        where: { id: roundId },
        data: {
          state: 'CLOSED',
          settledAt: new Date(),
          serverSeed: seedPack.serverSeed,
          rtpActual: outcome.actualRTP || null,
          resultJson: {
            ...outcome.result,
            won: outcome.won,
            payout: outcome.payout,
            netResult: outcome.won ? outcome.payout - (userBet.stake * 100) : -(userBet.stake * 100),
            provablyFair: reveal,
            settlement: {
              timestamp: new Date().toISOString(),
              jurisdiction: user.kycProfile?.jurisdiction || 'DEFAULT',
              userId: session.user.id,
              verified: reveal.verified
            }
          },
        },
      });

      return { settledRound, updatedBet, reveal, outcome };
    });

    // Get updated wallet balance
    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: userBet.walletId }
    });

    // Check if significant win requires reporting
    if (outcome.won && outcome.payout >= 1000000) { // $10,000 or more
      await createLargeWinAlert(session.user.id, outcome.payout, roundId);
    }

    logger.info('Real money casino round settled successfully', {
      roundId,
      userId: session.user.id,
      game: round.game,
      stake: userBet.stake * 100,
      payout: outcome.payout,
      won: outcome.won,
      jurisdiction: user.kycProfile.jurisdiction
    });

    return NextResponse.json({
      success: true,
      round: {
        id: settlementResult.settledRound.id,
        game: settlementResult.settledRound.game,
        state: settlementResult.settledRound.state,
        result: outcome.result,
      },
      bet: {
        id: settlementResult.updatedBet.id,
        stake: settlementResult.updatedBet.stake,
        payout: settlementResult.updatedBet.payout,
        won: outcome.won,
        netResult: outcome.won ? 
          outcome.payout - (userBet.stake * 100) : 
          -(userBet.stake * 100)
      },
      wallet: {
        balance: updatedWallet?.balance || 0,
        formatted: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(updatedWallet?.balance || 0)
      },
      provablyFair: {
        serverSeed: settlementResult.reveal.serverSeed,
        serverSeedHash: settlementResult.reveal.serverSeedHash,
        clientSeed: settlementResult.reveal.clientSeed,
        nonce: settlementResult.reveal.nonce,
        result: outcome.result,
        verified: settlementResult.reveal.verified,
        timestamp: settlementResult.reveal.timestamp
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Casino settle validation failed', { 
        // userId: removed for security,
        errors: error.errors 
      });
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Casino settle processing failed', {
      error
    });
    return NextResponse.json(
      { error: 'Settlement processing failed' },
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

async function createLargeWinAlert(userId: string, payoutInCents: number, roundId: string): Promise<void> {
  try {
    await prisma.complianceAlert.create({
      data: {
        userId,
        alertType: 'LARGE_TRANSACTION',
        severity: 'HIGH',
        title: 'Large Gaming Win',
        description: `Player won $${(payoutInCents / 100).toLocaleString()} in single game round`,
        details: JSON.stringify({
          roundId,
          payoutAmount: payoutInCents,
          game: 'casino_game',
          timestamp: new Date().toISOString(),
          requiresReview: payoutInCents >= 5000000 // $50,000 or more
        }),
        status: 'OPEN'
      }
    });

    logger.warn('Large gaming win detected', {
      userId,
      payout: payoutInCents,
      roundId
    });

  } catch (error) {
    logger.error('Failed to create large win alert', { userId, error });
  }
}
