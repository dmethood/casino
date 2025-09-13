import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { jurisdictionEngine } from './jurisdiction';

export interface ResponsibleGamblingLimits {
  // Deposit Limits (in cents)
  dailyDepositLimit?: number;
  weeklyDepositLimit?: number;
  monthlyDepositLimit?: number;
  
  // Loss Limits (in cents)
  dailyLossLimit?: number;
  weeklyLossLimit?: number;
  monthlyLossLimit?: number;
  
  // Time Limits (in minutes)
  dailyTimeLimit?: number;
  sessionTimeLimit?: number;
  
  // Reality Check
  realityCheckInterval: number;
}

export interface RGProfileData {
  userId: string;
  limits: ResponsibleGamblingLimits;
  status: 'ACTIVE' | 'COOLING_OFF' | 'SELF_EXCLUDED';
  coolingOffUntil?: Date;
  selfExcludedUntil?: Date;
  selfExclusionType?: string;
  mandatory: boolean; // Required by jurisdiction
  jurisdiction?: string;
  lastRealityCheck?: Date;
}

export interface GamingSessionData {
  userId: string;
  startedAt: Date;
  totalStaked: number; // in cents
  totalWon: number; // in cents
  gamesPlayed: number;
  ipAddress: string;
}

export interface RGAlert {
  userId: string;
  type: 'DEPOSIT_LIMIT' | 'LOSS_LIMIT' | 'TIME_LIMIT' | 'REALITY_CHECK' | 'PATTERN_CONCERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  triggered: boolean;
  autoBlock?: boolean; // Whether to automatically block the user
}

export interface RGCheck {
  canDeposit: boolean;
  canPlay: boolean;
  canWithdraw: boolean;
  alerts: RGAlert[];
  remainingLimits?: {
    dailyDeposit?: number;
    weeklyDeposit?: number;
    monthlyDeposit?: number;
    dailyLoss?: number;
    weeklyLoss?: number;
    monthlyLoss?: number;
    dailyTime?: number; // minutes
    sessionTime?: number; // minutes
  };
  nextRealityCheck?: Date;
  blockedUntil?: Date;
  blockReason?: string;
}

export interface SelfExclusionRequest {
  userId: string;
  type: 'COOLING_OFF' | 'SELF_EXCLUSION';
  duration: '24H' | '72H' | '7D' | '1M' | '3M' | '6M' | '1Y' | 'PERMANENT';
  reason?: string;
  contactDetails?: {
    phone?: string;
    email?: string;
  };
}

class ResponsibleGamblingManager {
  /**
   * Initialize RG profile for a user
   */
  public async initializeRGProfile(
    userId: string, 
    jurisdiction: string,
    mandatory = false
  ): Promise<RGProfileData> {
    try {
      // Get jurisdiction-specific RG requirements
      const jurisdictionRules = jurisdictionEngine.getJurisdictionRestrictions(jurisdiction);
      const defaultLimits = this.getDefaultLimits(jurisdiction, jurisdictionRules);

      // Create RG profile
      const rgProfile = await prisma.responsibleGamblingProfile.create({
        data: {
          userId,
          jurisdiction,
          mandatory,
          status: 'ACTIVE',
          realityCheckInterval: defaultLimits.realityCheckInterval,
          dailyDepositLimit: defaultLimits.dailyDepositLimit ? defaultLimits.dailyDepositLimit / 100 : null,
          weeklyDepositLimit: defaultLimits.weeklyDepositLimit ? defaultLimits.weeklyDepositLimit / 100 : null,
          monthlyDepositLimit: defaultLimits.monthlyDepositLimit ? defaultLimits.monthlyDepositLimit / 100 : null,
          dailyLossLimit: defaultLimits.dailyLossLimit ? defaultLimits.dailyLossLimit / 100 : null,
          weeklyLossLimit: defaultLimits.weeklyLossLimit ? defaultLimits.weeklyLossLimit / 100 : null,
          monthlyLossLimit: defaultLimits.monthlyLossLimit ? defaultLimits.monthlyLossLimit / 100 : null,
          dailyTimeLimit: defaultLimits.dailyTimeLimit,
          sessionTimeLimit: defaultLimits.sessionTimeLimit,
        },
      });

      logger.info('RG profile initialized', {
        userId,
        jurisdiction,
        mandatory,
        limits: defaultLimits,
      });

      return this.formatRGProfile(rgProfile);

    } catch (error) {
      logger.error('Failed to initialize RG profile', { userId, error });
      throw new Error('RG profile initialization failed');
    }
  }

  /**
   * Update user's responsible gambling limits
   */
  public async updateLimits(
    userId: string,
    newLimits: Partial<ResponsibleGamblingLimits>
  ): Promise<RGProfileData> {
    try {
      const existing = await prisma.responsibleGamblingProfile.findUnique({
        where: { userId },
      });

      if (!existing) {
        throw new Error('RG profile not found');
      }

      // For decreasing limits, apply immediately
      // For increasing limits, apply with delay (cooling-off period)
      const immediateUpdate = this.shouldApplyImmediately(existing, newLimits);
      const effectiveDate = immediateUpdate ? new Date() : 
        new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour delay for increases

      const updateData: any = {
        updatedAt: new Date(),
      };

      // Apply deposit limits
      if (newLimits.dailyDepositLimit !== undefined) {
        updateData.dailyDepositLimit = newLimits.dailyDepositLimit ? newLimits.dailyDepositLimit / 100 : null;
      }
      if (newLimits.weeklyDepositLimit !== undefined) {
        updateData.weeklyDepositLimit = newLimits.weeklyDepositLimit ? newLimits.weeklyDepositLimit / 100 : null;
      }
      if (newLimits.monthlyDepositLimit !== undefined) {
        updateData.monthlyDepositLimit = newLimits.monthlyDepositLimit ? newLimits.monthlyDepositLimit / 100 : null;
      }

      // Apply loss limits
      if (newLimits.dailyLossLimit !== undefined) {
        updateData.dailyLossLimit = newLimits.dailyLossLimit ? newLimits.dailyLossLimit / 100 : null;
      }
      if (newLimits.weeklyLossLimit !== undefined) {
        updateData.weeklyLossLimit = newLimits.weeklyLossLimit ? newLimits.weeklyLossLimit / 100 : null;
      }
      if (newLimits.monthlyLossLimit !== undefined) {
        updateData.monthlyLossLimit = newLimits.monthlyLossLimit ? newLimits.monthlyLossLimit / 100 : null;
      }

      // Apply time limits
      if (newLimits.dailyTimeLimit !== undefined) {
        updateData.dailyTimeLimit = newLimits.dailyTimeLimit;
      }
      if (newLimits.sessionTimeLimit !== undefined) {
        updateData.sessionTimeLimit = newLimits.sessionTimeLimit;
      }

      // Apply reality check interval
      if (newLimits.realityCheckInterval !== undefined) {
        updateData.realityCheckInterval = newLimits.realityCheckInterval;
      }

      const updated = await prisma.responsibleGamblingProfile.update({
        where: { userId },
        data: updateData,
      });

      // Record the limits change for audit
      await this.recordRGAuditLog(userId, 'LIMITS_UPDATED', {
        oldLimits: existing,
        newLimits: updated,
        immediateUpdate,
        effectiveDate,
      });

      logger.info('RG limits updated', {
        userId,
        immediateUpdate,
        effectiveDate,
      });

      return this.formatRGProfile(updated);

    } catch (error) {
      logger.error('Failed to update RG limits', { userId, error });
      throw new Error('RG limits update failed');
    }
  }

  /**
   * Perform comprehensive RG check before allowing actions
   */
  public async performRGCheck(
    userId: string,
    action: 'DEPOSIT' | 'PLAY' | 'WITHDRAW',
    context?: {
      depositAmount?: number; // in cents
      sessionDuration?: number; // in minutes
      ipAddress?: string;
    }
  ): Promise<RGCheck> {
    try {
      const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
        where: { userId },
        include: { sessions: true, alerts: true },
      });

      if (!rgProfile) {
        // Initialize profile if missing
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { kycProfile: true },
        });

        if (!user) {
          return this.createBlockedRGCheck('User not found');
        }

        await this.initializeRGProfile(
          userId,
          user.kycProfile?.jurisdiction || 'UNKNOWN'
        );

        return this.performRGCheck(userId, action, context);
      }

      // Check if user is currently blocked
      if (rgProfile.status !== 'ACTIVE') {
        return this.createBlockedRGCheck(
          `User status: ${rgProfile.status}`,
          (rgProfile.coolingOffUntil || rgProfile.selfExcludedUntil) || undefined
        );
      }

      const alerts: RGAlert[] = [];
      let canDeposit = action !== 'DEPOSIT';
      let canPlay = action !== 'PLAY';
      let canWithdraw = action !== 'WITHDRAW';

      // Check deposit limits
      if (action === 'DEPOSIT' && context?.depositAmount) {
        const depositCheck = await this.checkDepositLimits(
          userId,
          context.depositAmount,
          rgProfile
        );
        alerts.push(...depositCheck.alerts);
        canDeposit = depositCheck.canDeposit;
      }

      // Check loss limits (only affects playing)
      if (action === 'PLAY') {
        const lossCheck = await this.checkLossLimits(userId, rgProfile);
        alerts.push(...lossCheck.alerts);
        canPlay = lossCheck.canPlay;
      }

      // Check time limits
      const timeCheck = await this.checkTimeLimits(
        userId,
        rgProfile,
        context?.sessionDuration
      );
      alerts.push(...timeCheck.alerts);
      if (!timeCheck.canPlay) {
        canPlay = false;
        canDeposit = false; // Block deposits too if time limits exceeded
      }

      // Check for reality check
      const realityCheck = await this.checkRealityCheck(userId, rgProfile);
      if (realityCheck.needed) {
        alerts.push(realityCheck.alert!);
      }

      // Check for concerning patterns
      const patternCheck = await this.checkGamblingPatterns(userId);
      alerts.push(...patternCheck.alerts);

      // Create any triggered alerts
      await this.createRGAlerts(userId, alerts);

      // Calculate remaining limits
      const remainingLimits = await this.calculateRemainingLimits(userId, rgProfile);

      // Determine next reality check
      const nextRealityCheck = this.calculateNextRealityCheck(rgProfile);

      logger.debug('RG check completed', {
        userId,
        action,
        canDeposit,
        canPlay,
        canWithdraw,
        alertCount: alerts.length,
      });

      return {
        canDeposit,
        canPlay,
        canWithdraw,
        alerts,
        remainingLimits,
        nextRealityCheck,
      };

    } catch (error) {
      logger.error('RG check failed', { userId, action, error });
      // Fail safe - block all actions if RG check fails
      return this.createBlockedRGCheck('RG check failed');
    }
  }

  /**
   * Start a gaming session
   */
  public async startGamingSession(
    userId: string,
    ipAddress: string
  ): Promise<{ sessionId: string; nextRealityCheck?: Date }> {
    try {
      const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
        where: { userId },
      });

      if (!rgProfile) {
        throw new Error('RG profile not found');
      }

      // End any existing active sessions
      await this.endActiveSessions(userId);

      // Create new session
      const session = await prisma.gamingSession.create({
        data: {
          rgProfileId: rgProfile.id,
          ipAddress,
          startedAt: new Date(),
        },
      });

      // Calculate next reality check
      const nextRealityCheck = new Date(
        Date.now() + (rgProfile.realityCheckInterval * 60 * 1000)
      );

      logger.info('Gaming session started', {
        userId,
        sessionId: session.id,
        nextRealityCheck,
      });

      return {
        sessionId: session.id,
        nextRealityCheck,
      };

    } catch (error) {
      logger.error('Failed to start gaming session', { userId, error });
      throw new Error('Gaming session start failed');
    }
  }

  /**
   * End gaming session
   */
  public async endGamingSession(sessionId: string): Promise<void> {
    try {
      const session = await prisma.gamingSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.endedAt) {
        return; // Session not found or already ended
      }

      const duration = Math.floor(
        (Date.now() - session.startedAt.getTime()) / (60 * 1000)
      );

      await prisma.gamingSession.update({
        where: { id: sessionId },
        data: {
          endedAt: new Date(),
          duration,
        },
      });

      logger.info('Gaming session ended', {
        sessionId,
        duration,
      });

    } catch (error) {
      logger.error('Failed to end gaming session', { sessionId, error });
    }
  }

  /**
   * Process self-exclusion request
   */
  public async processSelfExclusion(request: SelfExclusionRequest): Promise<{
    success: boolean;
    exclusionId: string;
    activatedAt: Date;
    expiresAt?: Date;
  }> {
    try {
      const exclusionId = `se_${Date.now()}_${request.userId}`;
      const activatedAt = new Date();
      let expiresAt: Date | undefined;

      // Calculate expiration date
      if (request.duration !== 'PERMANENT') {
        const durationMap = {
          '24H': 24 * 60 * 60 * 1000,
          '72H': 72 * 60 * 60 * 1000,
          '7D': 7 * 24 * 60 * 60 * 1000,
          '1M': 30 * 24 * 60 * 60 * 1000,
          '3M': 90 * 24 * 60 * 60 * 1000,
          '6M': 180 * 24 * 60 * 60 * 1000,
          '1Y': 365 * 24 * 60 * 60 * 1000,
        };

        expiresAt = new Date(activatedAt.getTime() + durationMap[request.duration]);
      }

      // Update RG profile
      const updateData: any = {
        status: request.type === 'COOLING_OFF' ? 'COOLING_OFF' : 'SELF_EXCLUDED',
        updatedAt: new Date(),
      };

      if (request.type === 'COOLING_OFF') {
        updateData.coolingOffUntil = expiresAt;
        updateData.selfExclusionType = `COOLING_OFF_${request.duration}`;
      } else {
        updateData.selfExcludedUntil = expiresAt;
        updateData.selfExclusionType = `SELF_EXCLUSION_${request.duration}`;
      }

      await prisma.responsibleGamblingProfile.update({
        where: { userId: request.userId },
        data: updateData,
      });

      // End all active sessions
      await this.endActiveSessions(request.userId);

      // Invalidate all user sessions
      await prisma.userSession.updateMany({
        where: { userId: request.userId, isActive: true },
        data: { isActive: false },
      });

      // Record audit log
      await this.recordRGAuditLog(request.userId, 'SELF_EXCLUSION', {
        type: request.type,
        duration: request.duration,
        reason: request.reason,
        exclusionId,
        activatedAt,
        expiresAt,
      });

      logger.info('Self-exclusion processed', {
        userId: request.userId,
        type: request.type,
        duration: request.duration,
        exclusionId,
        expiresAt,
      });

      return {
        success: true,
        exclusionId,
        activatedAt,
        expiresAt,
      };

    } catch (error) {
      logger.error('Self-exclusion processing failed', {
        userId: request.userId,
        error,
      });
      throw new Error('Self-exclusion processing failed');
    }
  }

  /**
   * Show reality check to user
   */
  public async showRealityCheck(
    userId: string,
    sessionData?: {
      duration: number; // minutes
      totalStaked: number; // cents
      totalWon: number; // cents
      gamesPlayed: number;
    }
  ): Promise<{
    message: string;
    sessionStats?: {
      duration: string;
      totalStaked: string;
      totalWon: string;
      netResult: string;
      gamesPlayed: number;
    };
    nextCheck: Date;
  }> {
    try {
      // Update last reality check time
      const nextCheck = new Date(Date.now() + 60 * 60 * 1000); // Next check in 1 hour

      await prisma.responsibleGamblingProfile.update({
        where: { userId },
        data: { lastRealityCheck: new Date() },
      });

      // Format session data if provided
      let sessionStats;
      if (sessionData) {
        const netResult = sessionData.totalWon - sessionData.totalStaked;
        sessionStats = {
          duration: this.formatDuration(sessionData.duration),
          totalStaked: this.formatCurrency(sessionData.totalStaked),
          totalWon: this.formatCurrency(sessionData.totalWon),
          netResult: this.formatCurrency(Math.abs(netResult)),
          gamesPlayed: sessionData.gamesPlayed,
        };
      }

      // Record reality check shown
      await this.recordRGAuditLog(userId, 'REALITY_CHECK_SHOWN', {
        sessionData,
        nextCheck,
      });

      logger.info('Reality check shown', {
        userId,
        sessionData: sessionStats,
      });

      return {
        message: 'Take a moment to review your gaming activity.',
        sessionStats,
        nextCheck,
      };

    } catch (error) {
      logger.error('Failed to show reality check', { userId, error });
      throw new Error('Reality check failed');
    }
  }

  // Private helper methods...

  private getDefaultLimits(
    jurisdiction: string,
    jurisdictionRules: any
  ): ResponsibleGamblingLimits {
    // Base defaults
    const defaults: ResponsibleGamblingLimits = {
      realityCheckInterval: 60, // 1 hour
    };

    // Jurisdiction-specific defaults
    if (jurisdictionRules?.rgRequirements) {
      const rg = jurisdictionRules.rgRequirements;

      if (rg.mandatoryLimits) {
        defaults.dailyDepositLimit = 50000; // $500
        defaults.weeklyDepositLimit = 200000; // $2000
        defaults.monthlyDepositLimit = 500000; // $5000
        defaults.dailyLossLimit = 25000; // $250
        defaults.weeklyLossLimit = 100000; // $1000
        defaults.monthlyLossLimit = 250000; // $2500
      }

      if (rg.realityCheckInterval) {
        defaults.realityCheckInterval = rg.realityCheckInterval;
      }

      if (rg.sessionTimeLimit) {
        defaults.sessionTimeLimit = rg.sessionTimeLimit;
      }
    }

    // UK-specific requirements
    if (jurisdiction === 'GB') {
      defaults.dailyDepositLimit = 20000; // £200
      defaults.weeklyDepositLimit = 50000; // £500
      defaults.monthlyDepositLimit = 200000; // £2000
      defaults.realityCheckInterval = 60; // 1 hour mandatory
      defaults.sessionTimeLimit = 360; // 6 hours max
    }

    return defaults;
  }

  private shouldApplyImmediately(
    existing: any,
    newLimits: Partial<ResponsibleGamblingLimits>
  ): boolean {
    // Decreasing limits or adding new limits apply immediately
    // Increasing limits have a 24-hour delay
    
    const checks = [
      { old: (existing.dailyDepositLimit || 0) * 100, new: newLimits.dailyDepositLimit },
      { old: (existing.weeklyDepositLimit || 0) * 100, new: newLimits.weeklyDepositLimit },
      { old: (existing.monthlyDepositLimit || 0) * 100, new: newLimits.monthlyDepositLimit },
      { old: (existing.dailyLossLimit || 0) * 100, new: newLimits.dailyLossLimit },
      { old: (existing.weeklyLossLimit || 0) * 100, new: newLimits.weeklyLossLimit },
      { old: (existing.monthlyLossLimit || 0) * 100, new: newLimits.monthlyLossLimit },
      { old: existing.dailyTimeLimit, new: newLimits.dailyTimeLimit },
      { old: existing.sessionTimeLimit, new: newLimits.sessionTimeLimit },
    ];

    for (const check of checks) {
      if (check.new !== undefined) {
        // Adding a new limit or decreasing existing limit = immediate
        if (!check.old || check.new < check.old) {
          return true;
        }
        // Increasing limit = delayed
        if (check.new > check.old) {
          return false;
        }
      }
    }

    return true; // Default to immediate if no changes detected
  }

  private async checkDepositLimits(
    userId: string,
    amount: number,
    rgProfile: any
  ): Promise<{ canDeposit: boolean; alerts: RGAlert[] }> {
    const alerts: RGAlert[] = [];
    let canDeposit = true;

    // Get current deposit totals
    const totals = await this.getDepositTotals(userId);

    // Check daily limit
    if (rgProfile.dailyDepositLimit) {
      const dailyLimit = rgProfile.dailyDepositLimit * 100;
      const newDaily = totals.daily + amount;
      
      if (newDaily > dailyLimit) {
        canDeposit = false;
        alerts.push({
          userId,
          type: 'DEPOSIT_LIMIT',
          severity: 'HIGH',
          message: `Daily deposit limit of ${this.formatCurrency(dailyLimit)} would be exceeded`,
          triggered: true,
          autoBlock: true,
        });
      } else if (newDaily > dailyLimit * 0.9) {
        alerts.push({
          userId,
          type: 'DEPOSIT_LIMIT',
          severity: 'MEDIUM',
          message: `Approaching daily deposit limit (${this.formatCurrency(newDaily)}/${this.formatCurrency(dailyLimit)})`,
          triggered: true,
          autoBlock: false,
        });
      }
    }

    // Check weekly and monthly limits similarly...
    // Implementation would follow the same pattern

    return { canDeposit, alerts };
  }

  private async checkLossLimits(
    userId: string,
    rgProfile: any
  ): Promise<{ canPlay: boolean; alerts: RGAlert[] }> {
    // Implementation would check current losses against limits
    return { canPlay: true, alerts: [] };
  }

  private async checkTimeLimits(
    userId: string,
    rgProfile: any,
    sessionDuration?: number
  ): Promise<{ canPlay: boolean; alerts: RGAlert[] }> {
    // Implementation would check session and daily time limits
    return { canPlay: true, alerts: [] };
  }

  private async checkRealityCheck(
    userId: string,
    rgProfile: any
  ): Promise<{ needed: boolean; alert?: RGAlert }> {
    if (!rgProfile.lastRealityCheck) {
      return { needed: true, alert: {
        userId,
        type: 'REALITY_CHECK',
        severity: 'MEDIUM',
        message: 'Time for a reality check',
        triggered: true,
      }};
    }

    const timeSinceCheck = Date.now() - rgProfile.lastRealityCheck.getTime();
    const intervalMs = rgProfile.realityCheckInterval * 60 * 1000;

    if (timeSinceCheck >= intervalMs) {
      return { needed: true, alert: {
        userId,
        type: 'REALITY_CHECK',
        severity: 'MEDIUM',
        message: 'Time for a reality check',
        triggered: true,
      }};
    }

    return { needed: false };
  }

  private async checkGamblingPatterns(
    userId: string
  ): Promise<{ alerts: RGAlert[] }> {
    // Implementation would analyze gambling patterns for concerning behavior
    return { alerts: [] };
  }

  private createBlockedRGCheck(reason: string, blockedUntil?: Date): RGCheck {
    return {
      canDeposit: false,
      canPlay: false,
      canWithdraw: true, // Usually withdrawals are still allowed
      alerts: [{
        userId: '',
        type: 'PATTERN_CONCERN',
        severity: 'CRITICAL',
        message: reason,
        triggered: true,
        autoBlock: true,
      }],
      blockedUntil,
      blockReason: reason,
    };
  }

  private async createRGAlerts(userId: string, alerts: RGAlert[]): Promise<void> {
    for (const alert of alerts.filter(a => a.triggered)) {
      try {
        await prisma.rgAlert.create({
          data: {
            rgProfileId: (await prisma.responsibleGamblingProfile.findUnique({
              where: { userId }
            }))!.id,
            alertType: alert.type as any,
            severity: alert.severity,
            message: alert.message,
            triggered: true,
          },
        });
      } catch (error) {
        logger.error('Failed to create RG alert', { userId, alert, error });
      }
    }
  }

  private async calculateRemainingLimits(
    userId: string,
    rgProfile: any
  ): Promise<any> {
    // Implementation would calculate remaining limits for all categories
    return {};
  }

  private calculateNextRealityCheck(rgProfile: any): Date {
    if (!rgProfile.lastRealityCheck) {
      return new Date(Date.now() + (rgProfile.realityCheckInterval * 60 * 1000));
    }

    return new Date(
      rgProfile.lastRealityCheck.getTime() + 
      (rgProfile.realityCheckInterval * 60 * 1000)
    );
  }

  private async getDepositTotals(userId: string): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
  }> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart.getTime() - (dayStart.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [daily, weekly, monthly] = await Promise.all([
      this.getDepositTotalForPeriod(userId, dayStart),
      this.getDepositTotalForPeriod(userId, weekStart),
      this.getDepositTotalForPeriod(userId, monthStart),
    ]);

    return { daily, weekly, monthly };
  }

  private async getDepositTotalForPeriod(userId: string, since: Date): Promise<number> {
    const result = await prisma.paymentTransaction.aggregate({
      where: {
        userId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
      _sum: {
        amount: true,
      },
    });

    return (result._sum.amount || 0) * 100;
  }

  private async endActiveSessions(userId: string): Promise<void> {
    const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
      where: { userId },
    });

    if (rgProfile) {
      await prisma.gamingSession.updateMany({
        where: {
          rgProfileId: rgProfile.id,
          endedAt: null,
        },
        data: {
          endedAt: new Date(),
        },
      });
    }
  }

  private formatRGProfile(dbProfile: any): RGProfileData {
    return {
      userId: dbProfile.userId,
      limits: {
        dailyDepositLimit: dbProfile.dailyDepositLimit ? dbProfile.dailyDepositLimit * 100 : undefined,
        weeklyDepositLimit: dbProfile.weeklyDepositLimit ? dbProfile.weeklyDepositLimit * 100 : undefined,
        monthlyDepositLimit: dbProfile.monthlyDepositLimit ? dbProfile.monthlyDepositLimit * 100 : undefined,
        dailyLossLimit: dbProfile.dailyLossLimit ? dbProfile.dailyLossLimit * 100 : undefined,
        weeklyLossLimit: dbProfile.weeklyLossLimit ? dbProfile.weeklyLossLimit * 100 : undefined,
        monthlyLossLimit: dbProfile.monthlyLossLimit ? dbProfile.monthlyLossLimit * 100 : undefined,
        dailyTimeLimit: dbProfile.dailyTimeLimit,
        sessionTimeLimit: dbProfile.sessionTimeLimit,
        realityCheckInterval: dbProfile.realityCheckInterval,
      },
      status: dbProfile.status,
      coolingOffUntil: dbProfile.coolingOffUntil,
      selfExcludedUntil: dbProfile.selfExcludedUntil,
      selfExclusionType: dbProfile.selfExclusionType,
      mandatory: dbProfile.mandatory,
      jurisdiction: dbProfile.jurisdiction,
      lastRealityCheck: dbProfile.lastRealityCheck,
    };
  }

  private formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  private async recordRGAuditLog(
    userId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource: 'RESPONSIBLE_GAMBLING',
          details,
          outcome: 'SUCCESS',
          ipAddress: '', // Would be passed from request context
        },
      });
    } catch (error) {
      logger.error('Failed to record RG audit log', { userId, action, error });
    }
  }
}

// Export singleton instance
export const responsibleGamblingManager = new ResponsibleGamblingManager();
