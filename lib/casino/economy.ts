import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { CASINO_CONFIG } from './config';

export interface WalletBalance {
  walletId: string;
  balance: number; // demo credits in cents
  formatted: string; // formatted as currency
}

export interface TransactionRecord {
  id: string;
  amount: number;
  reason: string;
  ref?: string;
  createdAt: Date;
}

export interface BetValidation {
  valid: boolean;
  error?: string;
  walletId: string;
  balance: number;
}

export type TransactionReason = 
  | 'INITIAL_DEPOSIT'
  | 'DAILY_BONUS'
  | 'BET_STAKE'
  | 'BET_PAYOUT'
  | 'ADMIN_CREDIT'
  | 'ADMIN_DEBIT'
  | 'REFUND';

class DemoEconomyManager {
  /**
   * Get or create a demo wallet for a user (demo credits only)
   */
  async getOrCreateWallet(userId?: string): Promise<WalletBalance> {
    const walletId = userId ? `user-${userId}` : 'demo-wallet-guest';
    
    let wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: userId || undefined,
      },
    });

    if (!wallet) {
      // Create new wallet with initial demo credits
      wallet = await prisma.wallet.create({
        data: {
          id: walletId,
          userId: userId,
          balance: CASINO_CONFIG.DEMO_CREDITS.INITIAL_BALANCE,
        },
      });

      // Record initial deposit transaction
      await this.recordTransaction(
        wallet.id,
        CASINO_CONFIG.DEMO_CREDITS.INITIAL_BALANCE,
        'INITIAL_DEPOSIT',
        'welcome-bonus'
      );

      logger.info('Created new demo wallet', { walletId: wallet.id, userId });
    }

    return {
      walletId: wallet.id,
      balance: wallet.balance,
      formatted: this.formatDemoCredits(wallet.balance),
    };
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<WalletBalance | null> {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      return null;
    }

    return {
      walletId: wallet.id,
      balance: wallet.balance,
      formatted: this.formatDemoCredits(wallet.balance),
    };
  }

  /**
   * Validate bet amount and wallet balance
   */
  async validateBet(walletId: string, amount: number): Promise<BetValidation> {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      return {
        valid: false,
        error: 'Wallet not found',
        walletId,
        balance: 0,
      };
    }

    if (amount < CASINO_CONFIG.DEMO_CREDITS.MIN_BET) {
      return {
        valid: false,
        error: `Minimum bet is ${this.formatDemoCredits(CASINO_CONFIG.DEMO_CREDITS.MIN_BET)}`,
        walletId,
        balance: wallet.balance,
      };
    }

    if (amount > CASINO_CONFIG.DEMO_CREDITS.MAX_BET) {
      return {
        valid: false,
        error: `Maximum bet is ${this.formatDemoCredits(CASINO_CONFIG.DEMO_CREDITS.MAX_BET)}`,
        walletId,
        balance: wallet.balance,
      };
    }

    if (wallet.balance < amount) {
      return {
        valid: false,
        error: 'Insufficient demo credits',
        walletId,
        balance: wallet.balance,
      };
    }

    return {
      valid: true,
      walletId,
      balance: wallet.balance,
    };
  }

  /**
   * Reserve demo credits for a bet (atomically deduct from balance)
   */
  async reserveBetFunds(walletId: string, amount: number, roundId: string): Promise<boolean> {
    try {
      // Atomically update wallet balance and record transaction
      const [updatedWallet, transaction] = await prisma.$transaction([
        prisma.wallet.update({
          where: { 
            id: walletId,
            balance: { gte: amount }, // Ensure sufficient funds
          },
          data: {
            balance: { decrement: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId,
            amount: -amount,
            reason: 'BET_STAKE',
            referenceId: roundId,
          },
        }),
      ]);

      logger.info('Demo bet funds reserved', { 
        walletId, 
        amount, 
        roundId, 
        newBalance: updatedWallet.balance,
        transactionId: transaction.id 
      });

      return true;
    } catch (error) {
      logger.error('Failed to reserve demo bet funds', { walletId, amount, roundId, error });
      return false;
    }
  }

  /**
   * Process bet payout (add demo credit winnings to balance)
   */
  async processPayout(walletId: string, amount: number, roundId: string): Promise<boolean> {
    if (amount <= 0) {
      // No payout for losing bet
      return true;
    }

    try {
      const [updatedWallet, transaction] = await prisma.$transaction([
        prisma.wallet.update({
          where: { id: walletId },
          data: {
            balance: { increment: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId,
            amount,
            reason: 'BET_PAYOUT',
            referenceId: roundId,
          },
        }),
      ]);

      logger.info('Demo payout processed', { 
        walletId, 
        amount, 
        roundId, 
        newBalance: updatedWallet.balance,
        transactionId: transaction.id 
      });

      return true;
    } catch (error) {
      logger.error('Failed to process demo payout', { walletId, amount, roundId, error });
      return false;
    }
  }

  /**
   * Refund a bet (return demo credits to wallet)
   */
  async refundBet(walletId: string, amount: number, roundId: string): Promise<boolean> {
    try {
      const [updatedWallet, transaction] = await prisma.$transaction([
        prisma.wallet.update({
          where: { id: walletId },
          data: {
            balance: { increment: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId,
            amount,
            reason: 'REFUND',
            referenceId: roundId,
          },
        }),
      ]);

      logger.info('Demo bet refunded', { 
        walletId, 
        amount, 
        roundId, 
        newBalance: updatedWallet.balance,
        transactionId: transaction.id 
      });

      return true;
    } catch (error) {
      logger.error('Failed to refund demo bet', { walletId, amount, roundId, error });
      return false;
    }
  }

  /**
   * Give daily bonus demo credits
   */
  async giveDailyBonus(walletId: string): Promise<boolean> {
    try {
      // Check if bonus was already given today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingBonus = await prisma.walletTransaction.findFirst({
        where: {
          walletId,
          reason: 'DAILY_BONUS',
          createdAt: { gte: today },
        },
      });

      if (existingBonus) {
        return false; // Already received bonus today
      }

      const [updatedWallet, transaction] = await prisma.$transaction([
        prisma.wallet.update({
          where: { id: walletId },
          data: {
            balance: { increment: CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId,
            amount: CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS,
            reason: 'DAILY_BONUS',
            referenceId: 'daily-bonus',
          },
        }),
      ]);

      logger.info('Daily bonus given', { 
        walletId, 
        amount: CASINO_CONFIG.DEMO_CREDITS.DAILY_BONUS, 
        newBalance: updatedWallet.balance,
        transactionId: transaction.id 
      });

      return true;
    } catch (error) {
      logger.error('Failed to give daily bonus', { walletId, error });
      return false;
    }
  }

  /**
   * Admin credit/debit operations (demo credits only)
   */
  async adminAdjustBalance(
    walletId: string, 
    amount: number, 
    reason: string
  ): Promise<boolean> {
    try {
      const transactionReason: TransactionReason = amount > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT';
      
      const [updatedWallet, transaction] = await prisma.$transaction([
        prisma.wallet.update({
          where: { id: walletId },
          data: {
            balance: { increment: amount },
          },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId,
            amount,
            reason: transactionReason,
            referenceId: reason,
          },
        }),
      ]);

      logger.info('Admin demo balance adjustment', { 
        walletId, 
        amount, 
        reason,
        newBalance: updatedWallet.balance,
        transactionId: transaction.id 
      });

      return true;
    } catch (error) {
      logger.error('Failed admin demo balance adjustment', { walletId, amount, reason, error });
      return false;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    walletId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<TransactionRecord[]> {
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return transactions.map((tx: any) => ({
      id: tx.id,
      amount: tx.amount,
      reason: tx.reason,
      referenceId: tx.ref || undefined,
      createdAt: tx.createdAt,
    }));
  }

  /**
   * Record a transaction
   */
  private async recordTransaction(
    walletId: string,
    amount: number,
    reason: TransactionReason,
    ref?: string
  ): Promise<TransactionRecord> {
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId,
        amount,
        reason,
        ref,
      },
    });

    return {
      id: transaction.id,
      amount: transaction.amount,
      reason: transaction.reason,
      referenceId: transaction.ref || undefined,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Format demo credits (cents to display format)
   */
  formatDemoCredits(cents: number): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' Credits';
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(walletId: string): Promise<{
    totalBets: number;
    totalStaked: number;
    totalWon: number;
    netPL: number;
    winRate: number;
  }> {
    const transactions = await prisma.walletTransaction.findMany({
      where: { 
        walletId,
        reason: { in: ['BET_STAKE', 'BET_PAYOUT'] }
      },
    });

    const stakes = transactions.filter(tx => tx.reason === 'BET_STAKE');
    const payouts = transactions.filter(tx => tx.reason === 'BET_PAYOUT');

    const totalBets = stakes.length;
    const totalStaked = Math.abs(stakes.reduce((sum, tx) => sum + tx.amount, 0));
    const totalWon = payouts.reduce((sum, tx) => sum + tx.amount, 0);
    const netPL = totalWon - totalStaked;
    const winRate = totalBets > 0 ? (payouts.length / totalBets) * 100 : 0;

    return {
      totalBets,
      totalStaked,
      totalWon,
      netPL,
      winRate: Math.round(winRate * 100) / 100,
    };
  }

  /**
   * Check if wallet needs daily bonus
   */
  async canClaimDailyBonus(walletId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingBonus = await prisma.walletTransaction.findFirst({
      where: {
        walletId,
        reason: 'DAILY_BONUS',
        createdAt: { gte: today },
      },
    });

    return !existingBonus;
  }
}

// Export singleton instance
export const demoEconomy = new DemoEconomyManager();
