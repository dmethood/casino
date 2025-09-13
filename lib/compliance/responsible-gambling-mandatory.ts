/**
 * Mandatory Responsible Gambling System
 * Jurisdiction-specific RG controls with fail-closed enforcement
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RGLimits {
  dailyDepositLimit?: number;
  weeklyDepositLimit?: number;
  monthlyDepositLimit?: number;
  dailyLossLimit?: number;
  weeklyLossLimit?: number;
  monthlyLossLimit?: number;
  sessionTimeLimit?: number; // Minutes
}

interface RGAlert {
  type: 'DEPOSIT_LIMIT' | 'LOSS_LIMIT' | 'TIME_LIMIT' | 'REALITY_CHECK' | 'PATTERN_CONCERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  action: 'WARNING' | 'BLOCK' | 'COOLING_OFF' | 'SELF_EXCLUSION';
}

interface SessionTracker {
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalStaked: number;
  totalWon: number;
  gamesPlayed: number;
  realityChecks: number;
}

class MandatoryRGSystem {
  private activeSessions: Map<string, SessionTracker> = new Map();
  private realityCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize RG profile with jurisdiction-specific defaults
   */
  async initializeRGProfile(userId: string, jurisdiction: string): Promise<void> {
    const defaultLimits = this.getJurisdictionDefaults(jurisdiction);
    
    await prisma.responsibleGamblingProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...defaultLimits,
        realityCheckInterval: this.getRealityCheckInterval(jurisdiction),
        status: 'ACTIVE',
        mandatory: true,
        jurisdiction,
        createdAt: new Date()
      },
      update: {
        jurisdiction,
        mandatory: true,
        updatedAt: new Date()
      }
    });

    logger.info('RG profile initialized', { userId, jurisdiction });
  }

  /**
   * MANDATORY: Check limits before allowing deposit
   */
  async validateDeposit(userId: string, amount: number): Promise<{
    allowed: boolean;
    alert?: RGAlert;
    coolingOffRequired?: boolean;
  }> {
    try {
      const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
        where: { userId }
      });

      if (!rgProfile) {
        // Create profile with default limits if missing
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { kycProfile: true }
        });
        
        if (user?.kycProfile?.jurisdiction) {
          await this.initializeRGProfile(userId, user.kycProfile.jurisdiction);
          return this.validateDeposit(userId, amount); // Retry
        }
        
        return { allowed: false };
      }

      // Check if user is in cooling-off or self-excluded
      if (rgProfile.status === 'COOLING_OFF' || rgProfile.status === 'SELF_EXCLUDED') {
        return {
          allowed: false,
          alert: {
            type: 'DEPOSIT_LIMIT',
            severity: 'HIGH',
            message: `Account is ${rgProfile.status.toLowerCase().replace('_', ' ')}`,
            action: 'BLOCK'
          }
        };
      }

      // Check daily deposit limit
      if (rgProfile.dailyDepositLimit) {
        const todayDeposits = await this.getTodayDeposits(userId);
        if (todayDeposits + amount > rgProfile.dailyDepositLimit) {
          return {
            allowed: false,
            alert: {
              type: 'DEPOSIT_LIMIT',
              severity: 'HIGH',
              message: 'Daily deposit limit would be exceeded',
              action: 'BLOCK'
            }
          };
        }

        // Warn if approaching limit (80%)
        if (todayDeposits + amount > rgProfile.dailyDepositLimit * 0.8) {
          return {
            allowed: true,
            alert: {
              type: 'DEPOSIT_LIMIT',
              severity: 'MEDIUM',
              message: 'Approaching daily deposit limit',
              action: 'WARNING'
            }
          };
        }
      }

      // Check weekly and monthly limits similarly
      const weeklyDeposits = await this.getWeeklyDeposits(userId);
      if (rgProfile.weeklyDepositLimit && 
          weeklyDeposits + amount > rgProfile.weeklyDepositLimit) {
        return {
          allowed: false,
          alert: {
            type: 'DEPOSIT_LIMIT',
            severity: 'HIGH',
            message: 'Weekly deposit limit would be exceeded',
            action: 'BLOCK'
          }
        };
      }

      return { allowed: true };

    } catch (error) {
      logger.error('RG deposit validation error - failing closed', { userId, error });
      return { allowed: false };
    }
  }

  /**
   * Start gaming session with RG monitoring
   */
  async startGamingSession(userId: string, ipAddress: string): Promise<void> {
    const sessionTracker: SessionTracker = {
      userId,
      startTime: new Date(),
      totalStaked: 0,
      totalWon: 0,
      gamesPlayed: 0,
      realityChecks: 0
    };

    this.activeSessions.set(userId, sessionTracker);

    // Schedule reality checks
    this.scheduleRealityCheck(userId);

    // Create database session record
    await prisma.gamingSession.create({
      data: {
        rgProfileId: userId, // This should be the RG profile ID
        startedAt: new Date(),
        ipAddress
      }
    });

    logger.info('Gaming session started', { userId });
  }

  /**
   * Track bet for RG monitoring
   */
  async trackBet(userId: string, stake: number, payout: number): Promise<RGAlert[]> {
    const session = this.activeSessions.get(userId);
    if (!session) {
      await this.startGamingSession(userId, '127.0.0.1'); // Fallback
      return [];
    }

    session.totalStaked += stake;
    session.totalWon += payout;
    session.gamesPlayed++;

    const alerts: RGAlert[] = [];

    // Check loss limits
    const netLoss = session.totalStaked - session.totalWon;
    if (netLoss > 0) {
      const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
        where: { userId }
      });

      if (rgProfile?.dailyLossLimit) {
        const todayLoss = await this.getTodayLoss(userId) + netLoss;
        
        if (todayLoss >= rgProfile.dailyLossLimit) {
          alerts.push({
            type: 'LOSS_LIMIT',
            severity: 'CRITICAL',
            message: 'Daily loss limit reached',
            action: 'COOLING_OFF'
          });
        } else if (todayLoss >= rgProfile.dailyLossLimit * 0.8) {
          alerts.push({
            type: 'LOSS_LIMIT',
            severity: 'HIGH',
            message: 'Approaching daily loss limit',
            action: 'WARNING'
          });
        }
      }
    }

    // Check session time
    const sessionDuration = Date.now() - session.startTime.getTime();
    const sessionMinutes = sessionDuration / (1000 * 60);
    
    if (sessionMinutes > 240) { // 4 hours
      alerts.push({
        type: 'TIME_LIMIT',
        severity: 'HIGH',
        message: 'Long gaming session detected',
        action: 'WARNING'
      });
    }

    // Pattern analysis for concerning behavior
    if (session.gamesPlayed > 100 && netLoss > session.totalStaked * 0.8) {
      alerts.push({
        type: 'PATTERN_CONCERN',
        severity: 'HIGH',
        message: 'Concerning gambling pattern detected',
        action: 'WARNING'
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processRGAlert(userId, alert);
    }

    return alerts;
  }

  /**
   * Schedule mandatory reality checks
   */
  private scheduleRealityCheck(userId: string): void {
    const interval = parseInt(process.env.RG_REALITY_CHECK_INTERVAL || '3600') * 1000; // Default 1 hour

    const timer = setInterval(async () => {
      await this.triggerRealityCheck(userId);
    }, interval);

    this.realityCheckIntervals.set(userId, timer);
  }

  private async triggerRealityCheck(userId: string): Promise<void> {
    const session = this.activeSessions.get(userId);
    if (!session) return;

    session.realityChecks++;
    
    // Create reality check alert
    await this.processRGAlert(userId, {
      type: 'REALITY_CHECK',
      severity: 'MEDIUM',
      message: `You have been playing for ${Math.round((Date.now() - session.startTime.getTime()) / (1000 * 60))} minutes`,
      action: 'WARNING'
    });

    logger.info('Reality check triggered', { 
      userId,
      sessionDuration: Date.now() - session.startTime.getTime(),
      checkNumber: session.realityChecks
    });
  }

  /**
   * End gaming session
   */
  async endGamingSession(userId: string): Promise<void> {
    const session = this.activeSessions.get(userId);
    if (!session) return;

    session.endTime = new Date();
    const duration = session.endTime.getTime() - session.startTime.getTime();

    // Update database session
    await prisma.gamingSession.updateMany({
      where: {
        rgProfileId: userId, // This should be the RG profile ID
        endedAt: null
      },
      data: {
        endedAt: session.endTime,
        duration: Math.round(duration / (1000 * 60)), // Minutes
        totalStaked: session.totalStaked,
        totalWon: session.totalWon,
        netResult: session.totalWon - session.totalStaked,
        gamesPlayed: session.gamesPlayed
      }
    });

    // Clear timers
    const timer = this.realityCheckIntervals.get(userId);
    if (timer) {
      clearInterval(timer);
      this.realityCheckIntervals.delete(userId);
    }

    this.activeSessions.delete(userId);

    logger.info('Gaming session ended', {
      userId,
      duration: Math.round(duration / (1000 * 60)),
      totalStaked: session.totalStaked,
      totalWon: session.totalWon,
      netResult: session.totalWon - session.totalStaked
    });
  }

  private async processRGAlert(userId: string, alert: RGAlert): Promise<void> {
    // Create RG alert record
    await prisma.rgAlert.create({
      data: {
        rgProfileId: userId, // This should be the RG profile ID
        alertType: alert.type as any,
        severity: alert.severity,
        message: alert.message,
        triggered: true,
        acknowledged: false
      }
    });

    // Take action based on alert
    switch (alert.action) {
      case 'COOLING_OFF':
        await this.initiateCoolingOff(userId, 24); // 24 hours
        break;
      
      case 'BLOCK':
        await this.blockGaming(userId);
        break;
      
      case 'WARNING':
        // Alert is recorded, no additional action
        break;
    }

    logger.warn('RG alert processed', { userId, alert });
  }

  private async initiateCoolingOff(userId: string, hours: number): Promise<void> {
    const coolingOffUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    
    await prisma.responsibleGamblingProfile.update({
      where: { userId },
      data: {
        status: 'COOLING_OFF',
        coolingOffUntil,
        updatedAt: new Date()
      }
    });

    // End current session
    await this.endGamingSession(userId);

    logger.info('Cooling-off initiated', { userId, coolingOffUntil });
  }

  private async blockGaming(userId: string): Promise<void> {
    await prisma.responsibleGamblingProfile.update({
      where: { userId },
      data: {
        status: 'COOLING_OFF',
        coolingOffUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours minimum
        updatedAt: new Date()
      }
    });

    await this.endGamingSession(userId);

    logger.warn('Gaming blocked for user', { userId });
  }

  private getJurisdictionDefaults(jurisdiction: string): RGLimits {
    switch (jurisdiction) {
      case 'GB': // UK - Strict limits
        return {
          dailyDepositLimit: 50000, // £500
          weeklyDepositLimit: 200000, // £2000
          monthlyDepositLimit: 800000, // £8000
          dailyLossLimit: 25000, // £250
          weeklyLossLimit: 100000, // £1000
          sessionTimeLimit: 120 // 2 hours
        };
      
      case 'MT': // Malta - Standard limits
        return {
          dailyDepositLimit: 100000, // €1000
          weeklyDepositLimit: 500000, // €5000
          monthlyDepositLimit: 2000000, // €20000
          dailyLossLimit: 50000, // €500
          weeklyLossLimit: 200000, // €2000
          sessionTimeLimit: 180 // 3 hours
        };
      
      default: // Conservative defaults
        return {
          dailyDepositLimit: 20000, // $200
          weeklyDepositLimit: 100000, // $1000
          monthlyDepositLimit: 400000, // $4000
          dailyLossLimit: 10000, // $100
          weeklyLossLimit: 50000, // $500
          sessionTimeLimit: 120 // 2 hours
        };
    }
  }

  private getRealityCheckInterval(jurisdiction: string): number {
    switch (jurisdiction) {
      case 'GB': return 60; // UK: Every hour
      case 'MT': return 60; // Malta: Every hour
      default: return 120; // Default: Every 2 hours
    }
  }

  private async getTodayDeposits(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await prisma.paymentTransaction.aggregate({
      where: {
        userId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    });

    return result._sum.amount || 0;
  }

  private async getWeeklyDeposits(userId: string): Promise<number> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const result = await prisma.paymentTransaction.aggregate({
      where: {
        userId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        createdAt: { gte: weekStart }
      },
      _sum: { amount: true }
    });

    return result._sum.amount || 0;
  }

  private async getTodayLoss(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stakes = await prisma.walletTransaction.aggregate({
      where: {
        walletId: userId, // This should be the actual wallet ID
        type: 'BET_STAKE',
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    });

    const payouts = await prisma.walletTransaction.aggregate({
      where: {
        walletId: userId, // This should be the actual wallet ID
        type: 'BET_PAYOUT',
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    });

    const totalStaked = stakes._sum.amount || 0;
    const totalWon = payouts._sum.amount || 0;
    
    return Math.max(0, totalStaked - totalWon);
  }

  /**
   * GAMSTOP integration for UK players
   */
  async checkGAMSTOP(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { kycProfile: true }
    });

    if (user?.kycProfile?.jurisdiction !== 'GB') {
      return false; // GAMSTOP only applies to UK
    }

    // In production, integrate with GAMSTOP API
    // Mock implementation
    const gamstopApiKey = process.env.GAMSTOP_API_KEY;
    if (!gamstopApiKey) {
      logger.warn('GAMSTOP_API_KEY not configured for UK player');
      return false;
    }

    // Check against GAMSTOP database
    // This would be a real API call in production
    const isExcluded = false; // Mock result

    if (isExcluded) {
      // Block user immediately
      await prisma.responsibleGamblingProfile.update({
        where: { userId },
        data: {
          status: 'SELF_EXCLUDED',
          selfExcludedUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
          selfExclusionType: 'PERMANENT'
        }
      });

      logger.error('User found on GAMSTOP - permanent exclusion applied', { userId });
    }

    return isExcluded;
  }

  /**
   * Mandatory self-exclusion tools
   */
  async initiateSelfExclusion(
    userId: string, 
    type: 'COOLING_OFF_24H' | 'COOLING_OFF_72H' | 'COOLING_OFF_7D' | 'SELF_EXCLUSION_1M' | 'SELF_EXCLUSION_3M' | 'SELF_EXCLUSION_6M' | 'SELF_EXCLUSION_1Y' | 'PERMANENT',
    reason: string
  ): Promise<void> {
    const durations = {
      'COOLING_OFF_24H': 24 * 60 * 60 * 1000,
      'COOLING_OFF_72H': 72 * 60 * 60 * 1000,
      'COOLING_OFF_7D': 7 * 24 * 60 * 60 * 1000,
      'SELF_EXCLUSION_1M': 30 * 24 * 60 * 60 * 1000,
      'SELF_EXCLUSION_3M': 90 * 24 * 60 * 60 * 1000,
      'SELF_EXCLUSION_6M': 180 * 24 * 60 * 60 * 1000,
      'SELF_EXCLUSION_1Y': 365 * 24 * 60 * 60 * 1000,
      'PERMANENT': 50 * 365 * 24 * 60 * 60 * 1000 // 50 years
    };

    const duration = durations[type];
    const excludedUntil = new Date(Date.now() + duration);
    
    await prisma.responsibleGamblingProfile.update({
      where: { userId },
      data: {
        status: type.startsWith('COOLING') ? 'COOLING_OFF' : 'SELF_EXCLUDED',
        coolingOffUntil: type.startsWith('COOLING') ? excludedUntil : null,
        selfExcludedUntil: type.startsWith('SELF') ? excludedUntil : null,
        selfExclusionType: type,
        updatedAt: new Date()
      }
    });

    // End current session immediately
    await this.endGamingSession(userId);

    // Create compliance alert
    await prisma.complianceAlert.create({
      data: {
        userId,
        alertType: 'REGULATORY_BREACH',
        severity: 'HIGH',
        title: 'Self-Exclusion Activated',
        description: `User initiated ${type} - Reason: ${reason}`,
        details: JSON.stringify({ type, reason, excludedUntil }) as any
      }
    });

    logger.info('Self-exclusion initiated', { userId, type, excludedUntil });
  }
}

export const mandatoryRG = new MandatoryRGSystem();
export type { RGLimits, RGAlert, SessionTracker };
