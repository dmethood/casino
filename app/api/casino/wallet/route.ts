import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { demoEconomy } from '@/lib/casino/economy';
import { CASINO_CONFIG } from '@/lib/casino/config';
import { createRequestLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Check if casino is enabled
    if (!CASINO_CONFIG.ENABLED) {
      return NextResponse.json(
        { error: 'Casino module is disabled' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Get or create demo wallet
    const wallet = await demoEconomy.getOrCreateWallet(userId);
    
    // Get wallet statistics
    const stats = await demoEconomy.getWalletStats(wallet.walletId);
    
    // Check if daily bonus is available
    const canClaimBonus = await demoEconomy.canClaimDailyBonus(wallet.walletId);

    logger.info('Wallet info fetched', {
      userId: userId || 'guest',
      walletId: wallet.walletId,
      balance: wallet.balance,
    });

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.walletId,
        balance: wallet.balance,
        formatted: wallet.formatted,
        isDemo: true,
        currency: 'Demo Credits',
      },
      stats: {
        totalBets: stats.totalBets,
        totalStaked: stats.totalStaked,
        totalWon: stats.totalWon,
        netPL: stats.netPL,
        winRate: stats.winRate,
      },
      bonus: {
        available: canClaimBonus,
        amount: CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS,
        formatted: demoEconomy.formatDemoCredits(CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS),
      },
      limits: {
        minBet: CASINO_CONFIG.DEMO_CREDITS.MIN_BET,
        maxBet: CASINO_CONFIG.DEMO_CREDITS.MAX_BET,
        minBetFormatted: demoEconomy.formatDemoCredits(CASINO_CONFIG.DEMO_CREDITS.MIN_BET),
        maxBetFormatted: demoEconomy.formatDemoCredits(CASINO_CONFIG.DEMO_CREDITS.MAX_BET),
      },
    });

  } catch (error) {
    logger.error('Failed to fetch wallet info', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Check if casino is enabled
    if (!CASINO_CONFIG.ENABLED) {
      return NextResponse.json(
        { error: 'Casino module is disabled' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const body = await request.json();
    const { action } = body;

    if (action === 'claim_daily_bonus') {
      // Get wallet
      const wallet = await demoEconomy.getOrCreateWallet(userId);
      
      // Give daily bonus
      const bonusGiven = await demoEconomy.giveDailyBonus(wallet.walletId);
      
      if (!bonusGiven) {
        return NextResponse.json(
          { error: 'Daily bonus already claimed or error occurred' },
          { status: 400 }
        );
      }

      // Get updated balance
      const updatedWallet = await demoEconomy.getWalletBalance(wallet.walletId);
      
      logger.info('Daily bonus claimed', {
        userId: userId || 'guest',
        walletId: wallet.walletId,
        bonusAmount: CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS,
      });

      return NextResponse.json({
        success: true,
        message: 'Daily bonus claimed successfully',
        bonus: {
          amount: CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS,
          formatted: demoEconomy.formatDemoCredits(CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS),
        },
        wallet: updatedWallet,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Failed to process wallet action', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
