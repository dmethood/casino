import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // Days
    preventReuse: number; // Number of previous passwords
  };
  sessionSecurity: {
    maxAge: number; // Minutes
    inactivityTimeout: number; // Minutes
    concurrentSessions: number;
    requireIPConsistency: boolean;
  };
  twoFactorAuth: {
    enforced: boolean;
    backupCodesCount: number;
    windowSize: number; // TOTP window size
    issuer: string;
  };
  encryptionKeys: {
    application: Buffer;
    database: Buffer;
    pii: Buffer; // For PII encryption
  };
}

export interface AuditLogEntry {
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  fingerprint?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'DENIED';
  riskScore?: number;
  timestamp: Date;
  metadata?: {
    jurisdiction?: string;
    complianceFlags?: string[];
    sensitiveData?: boolean;
  };
}

export interface SecurityEvent {
  type: 'SUSPICIOUS_LOGIN' | 'BRUTE_FORCE' | 'DATA_BREACH' | 'COMPLIANCE_VIOLATION' | 'SYSTEM_INTRUSION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details: Record<string, any>;
  affectedUsers?: string[];
  source: {
    ipAddress: string;
    userAgent?: string;
    fingerprint?: string;
  };
  timestamp: Date;
  requiresImmedateAction: boolean;
}

export interface RiskAssessment {
  userId?: string;
  ipAddress: string;
  riskScore: number; // 0-100
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  recommendation: 'ALLOW' | 'CHALLENGE' | 'BLOCK' | 'ESCALATE';
  expiresAt: Date;
}

/**
 * Comprehensive Security Manager
 * Handles 2FA, audit logging, encryption, risk assessment, and security monitoring
 */
export class SecurityManager {
  private config: SecurityConfig;
  private riskCache = new Map<string, RiskAssessment>();
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig(): void {
    this.config = {
      passwordPolicy: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '90'),
        preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5'),
      },
      sessionSecurity: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '480'), // 8 hours
        inactivityTimeout: parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || '30'),
        concurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3'),
        requireIPConsistency: process.env.REQUIRE_IP_CONSISTENCY === 'true',
      },
      twoFactorAuth: {
        enforced: process.env.ADMIN_2FA_ENFORCED === 'true',
        backupCodesCount: 10,
        windowSize: 2,
        issuer: process.env.TOTP_ISSUER || 'Casino Platform',
      },
      encryptionKeys: {
        application: this.deriveKey(process.env.APP_ENCRYPTION_KEY || ''),
        database: this.deriveKey(process.env.DB_ENCRYPTION_KEY || ''),
        pii: this.deriveKey(process.env.PII_ENCRYPTION_KEY || ''),
      },
    };

    if (!process.env.APP_ENCRYPTION_KEY) {
      throw new Error('FATAL: Encryption keys not configured');
    }

    logger.info('Security manager initialized', {
      passwordPolicyEnabled: true,
      twoFactorEnforced: this.config.twoFactorAuth.enforced,
      sessionTimeout: this.config.sessionSecurity.inactivityTimeout,
    });
  }

  /**
   * Derive encryption key from environment variable
   */
  private deriveKey(keyString: string): Buffer {
    if (!keyString) {
      throw new Error('Encryption key not provided');
    }
    
    // Use PBKDF2 to derive a proper key
    return crypto.pbkdf2Sync(keyString, 'casino-salt', 100000, 32, 'sha256');
  }

  /**
   * Encrypt sensitive data
   */
  public encryptPII(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', this.config.encryptionKeys.pii);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      logger.error('PII encryption failed', { error });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  public decryptPII(encryptedData: string): string {
    try {
      const [ivHex, encrypted, authTagHex] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-gcm', this.config.encryptionKeys.pii);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('PII decryption failed', { error });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Set up 2FA for a user
   */
  public async setup2FA(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: user.email,
        issuer: this.config.twoFactorAuth.issuer,
        length: 32,
      });

      // Generate backup codes
      const backupCodes = Array.from({ length: this.config.twoFactorAuth.backupCodesCount }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Encrypt and store
      const encryptedSecret = this.encryptPII(secret.base32);
      const encryptedBackupCodes = backupCodes.map(code => this.encryptPII(code));

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: encryptedSecret,
          backupCodes: JSON.stringify(encryptedBackupCodes),
          twoFactorEnabled: false, // Will be enabled after verification
        },
      });

      // Log 2FA setup
      await this.auditLog({
        userId,
        action: '2FA_SETUP_INITIATED',
        resource: 'USER_SECURITY',
        details: JSON.stringify({ method: 'TOTP' }),
        outcome: 'SUCCESS',
        ipAddress: '',
        timestamp: new Date(),
      });

      logger.info('2FA setup initiated', { userId });

      return {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url || '',
        backupCodes,
      };

    } catch (error) {
      logger.error('2FA setup failed', { userId, error });
      throw new Error('2FA setup failed');
    }
  }

  /**
   * Verify 2FA token
   */
  public async verify2FA(
    userId: string, 
    token: string,
    isBackupCode = false
  ): Promise<{ valid: boolean; used?: boolean }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.twoFactorSecret) {
        return { valid: false };
      }

      let valid = false;
      let used = false;

      if (isBackupCode) {
        // Check backup codes
        const backupCodes = user.backupCodes?.map(code => this.decryptPII(code)) || [];
        const codeIndex = backupCodes.findIndex(code => code === token.toUpperCase());
        
        if (codeIndex !== -1) {
          valid = true;
          used = true;

          // Remove used backup code
          const updatedCodes = user.backupCodes?.filter((_, index) => index !== codeIndex) || [];
          await prisma.user.update({
            where: { id: userId },
            data: { backupCodes: updatedCodes },
          });
        }
      } else {
        // Verify TOTP
        const secret = this.decryptPII(user.twoFactorSecret);
        valid = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token,
          window: this.config.twoFactorAuth.windowSize,
        });
      }

      // Log verification attempt
      await this.auditLog({
        userId,
        action: '2FA_VERIFICATION',
        resource: 'USER_SECURITY',
        details: JSON.stringify({
          method: isBackupCode ? 'BACKUP_CODE' : 'TOTP',
          valid,
          used,
        }),
        outcome: valid ? 'SUCCESS' : 'FAILURE',
        ipAddress: '',
        timestamp: new Date(),
      });

      if (valid && !user.twoFactorEnabled) {
        // Enable 2FA on first successful verification
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorEnabled: true },
        });
      }

      return { valid, used };

    } catch (error) {
      logger.error('2FA verification failed', { userId, error });
      return { valid: false };
    }
  }

  /**
   * Generate secure session
   */
  public async createSecureSession(
    userId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{
    sessionId: string;
    token: string;
    expiresAt: Date;
  }> {
    try {
      // Check concurrent sessions limit
      await this.enforceSessionLimits(userId);

      // Generate session data
      const sessionId = crypto.randomBytes(32).toString('hex');
      const token = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(
        Date.now() + (this.config.sessionSecurity.maxAge * 60 * 1000)
      );

      // Create session
      await prisma.userSession.create({
        data: {
          id: sessionId,
          userId,
          sessionToken: token,
          ipAddress,
          userAgent: userAgent || '',
          isActive: true,
          expiresAt,
        },
      });

      // Log session creation
      await this.auditLog({
        userId,
        sessionId,
        action: 'SESSION_CREATED',
        resource: 'USER_SESSION',
        details: JSON.stringify({
          ipAddress,
          userAgent,
          expiresAt,
        }),
        outcome: 'SUCCESS',
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });

      logger.info('Secure session created', {
        userId,
        sessionId,
        ipAddress,
        expiresAt,
      });

      return { sessionId, token, expiresAt };

    } catch (error) {
      logger.error('Session creation failed', { userId, error });
      throw new Error('Session creation failed');
    }
  }

  /**
   * Validate session and check security
   */
  public async validateSession(
    sessionToken: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{
    valid: boolean;
    userId?: string;
    sessionId?: string;
    requiresRenewal?: boolean;
    securityViolation?: string;
  }> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session || !session.isActive) {
        return { valid: false, securityViolation: 'Invalid session' };
      }

      // Check expiration
      if (new Date() > session.expiresAt) {
        await this.invalidateSession(session.id);
        return { valid: false, securityViolation: 'Session expired' };
      }

      // Check IP consistency if required
      if (this.config.sessionSecurity.requireIPConsistency) {
        if (session.ipAddress !== ipAddress) {
          await this.invalidateSession(session.id);
          
          // Log security violation
          await this.logSecurityEvent({
            type: 'SUSPICIOUS_LOGIN',
            severity: 'HIGH',
            description: 'IP address changed during session',
            details: JSON.stringify({
              sessionId: session.id,
              originalIP: session.ipAddress,
              newIP: ipAddress,
            }),
            source: { ipAddress },
            timestamp: new Date(),
            requiresImmedateAction: true,
          });

          return { valid: false, securityViolation: 'IP address mismatch' };
        }
      }

      // Check inactivity timeout
      const lastActivity = session.lastActivity;
      const inactivityLimit = new Date(
        Date.now() - (this.config.sessionSecurity.inactivityTimeout * 60 * 1000)
      );

      if (lastActivity < inactivityLimit) {
        await this.invalidateSession(session.id);
        return { valid: false, securityViolation: 'Session timeout due to inactivity' };
      }

      // Update last activity
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivity: new Date() },
      });

      // Check if session needs renewal
      const renewalThreshold = new Date(
        session.expiresAt.getTime() - (30 * 60 * 1000) // 30 minutes before expiry
      );
      const requiresRenewal = new Date() > renewalThreshold;

      return {
        valid: true,
        userId: session.userId,
        sessionId: session.id,
        requiresRenewal,
      };

    } catch (error) {
      logger.error('Session validation failed', { error });
      return { valid: false, securityViolation: 'Validation error' };
    }
  }

  /**
   * Perform risk assessment
   */
  public async assessRisk(
    request: NextRequest,
    userId?: string,
    additionalContext?: Record<string, any>
  ): Promise<RiskAssessment> {
    try {
      const ipAddress = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || '';
      const fingerprint = this.generateFingerprint(request);

      // Check cache first
      const cacheKey = `risk_${userId || ipAddress}_${fingerprint}`;
      const cached = this.riskCache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        return cached;
      }

      const factors: Array<{ factor: string; impact: number; description: string }> = [];
      let riskScore = 0;

      // IP reputation check
      const ipRisk = await this.checkIPReputation(ipAddress);
      if (ipRisk > 0) {
        factors.push({
          factor: 'IP_REPUTATION',
          impact: ipRisk,
          description: 'IP address has negative reputation',
        });
        riskScore += ipRisk;
      }

      // Geolocation risk
      const geoRisk = await this.checkGeolocationRisk(ipAddress);
      if (geoRisk > 0) {
        factors.push({
          factor: 'GEOLOCATION',
          impact: geoRisk,
          description: 'Request from high-risk location',
        });
        riskScore += geoRisk;
      }

      // Brute force detection
      if (userId) {
        const bruteForceRisk = this.checkBruteForce(userId, ipAddress);
        if (bruteForceRisk > 0) {
          factors.push({
            factor: 'BRUTE_FORCE',
            impact: bruteForceRisk,
            description: 'Multiple failed login attempts detected',
          });
          riskScore += bruteForceRisk;
        }
      }

      // Device fingerprinting
      const deviceRisk = await this.checkDeviceRisk(fingerprint, userId);
      if (deviceRisk > 0) {
        factors.push({
          factor: 'DEVICE_FINGERPRINT',
          impact: deviceRisk,
          description: 'Unknown or suspicious device',
        });
        riskScore += deviceRisk;
      }

      // Velocity checks
      if (userId) {
        const velocityRisk = await this.checkVelocityRisk(userId);
        if (velocityRisk > 0) {
          factors.push({
            factor: 'VELOCITY',
            impact: velocityRisk,
            description: 'Unusual activity velocity detected',
          });
          riskScore += velocityRisk;
        }
      }

      // Determine recommendation
      let recommendation: 'ALLOW' | 'CHALLENGE' | 'BLOCK' | 'ESCALATE';
      if (riskScore >= 80) {
        recommendation = 'BLOCK';
      } else if (riskScore >= 60) {
        recommendation = 'ESCALATE';
      } else if (riskScore >= 30) {
        recommendation = 'CHALLENGE';
      } else {
        recommendation = 'ALLOW';
      }

      const assessment: RiskAssessment = {
        userId,
        ipAddress,
        riskScore: Math.min(riskScore, 100),
        factors,
        recommendation,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };

      // Cache the assessment
      this.riskCache.set(cacheKey, assessment);

      // Log high-risk assessments
      if (riskScore >= 60) {
        await this.logSecurityEvent({
          type: 'SUSPICIOUS_LOGIN',
          severity: riskScore >= 80 ? 'CRITICAL' : 'HIGH',
          description: 'High-risk activity detected',
          details: JSON.stringify({
            riskScore,
            factors,
            recommendation,
            additionalContext,
          }),
          source: { ipAddress, userAgent, fingerprint },
          timestamp: new Date(),
          requiresImmedateAction: riskScore >= 80,
        });
      }

      return assessment;

    } catch (error) {
      logger.error('Risk assessment failed', { error });
      
      // Fail-safe: return high-risk assessment on error
      return {
        userId,
        ipAddress: this.getClientIP(request),
        riskScore: 75,
        factors: [{
          factor: 'SYSTEM_ERROR',
          impact: 75,
          description: 'Risk assessment system error',
        }],
        recommendation: 'CHALLENGE',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
    }
  }

  /**
   * Comprehensive audit logging
   */
  public async auditLog(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitize sensitive data
      const sanitizedDetails = this.sanitizeAuditData(entry.details);

      // Calculate risk score if not provided
      const riskScore = entry.riskScore || this.calculateAuditRiskScore(entry);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: JSON.stringify({
            ...sanitizedDetails,
            sessionId: entry.sessionId,
            fingerprint: entry.fingerprint,
            metadata: entry.metadata,
          }),
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          outcome: entry.outcome,
          riskScore,
        },
      });

      // Check for compliance requirements
      if (this.requiresComplianceNotification(entry)) {
        await this.notifyComplianceTeam(entry);
      }

      logger.debug('Audit log created', {
        action: entry.action,
        resource: entry.resource,
        outcome: entry.outcome,
        riskScore,
      });

    } catch (error) {
      logger.error('Audit logging failed', { entry, error });
      // Don't throw - audit logging failures shouldn't break operations
    }
  }

  // Private helper methods...

  private async enforceSessionLimits(userId: string): Promise<void> {
    const activeSessions = await prisma.userSession.count({
      where: { userId, isActive: true },
    });

    if (activeSessions >= this.config.sessionSecurity.concurrentSessions) {
      // Deactivate oldest sessions
      const sessionsToDeactivate = activeSessions - this.config.sessionSecurity.concurrentSessions + 1;
      
      const oldestSessions = await prisma.userSession.findMany({
        where: { userId, isActive: true },
        orderBy: { lastActivity: 'asc' },
        take: sessionsToDeactivate,
      });

      for (const session of oldestSessions) {
        await this.invalidateSession(session.id);
      }
    }
  }

  private async invalidateSession(sessionId: string): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    
    return request.ip || '127.0.0.1';
  }

  private generateFingerprint(request: NextRequest): string {
    const components = [
      request.headers.get('user-agent') || '',
      request.headers.get('accept-language') || '',
      request.headers.get('accept-encoding') || '',
      request.headers.get('sec-ch-ua') || '',
      request.headers.get('sec-ch-ua-platform') || '',
    ];

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16);
  }

  private async checkIPReputation(ipAddress: string): Promise<number> {
    // Implementation would check against threat intelligence feeds
    // Return risk score 0-50
    return 0;
  }

  private async checkGeolocationRisk(ipAddress: string): Promise<number> {
    // Implementation would check IP geolocation against high-risk countries
    return 0;
  }

  private checkBruteForce(userId: string, ipAddress: string): number {
    const key = `${userId}_${ipAddress}`;
    const attempts = this.loginAttempts.get(key);
    
    if (!attempts) return 0;
    
    const recentAttempts = attempts.count;
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    
    // High risk if many recent attempts
    if (recentAttempts >= 10 && timeSinceLastAttempt < 30 * 60 * 1000) {
      return 40;
    }
    if (recentAttempts >= 5 && timeSinceLastAttempt < 10 * 60 * 1000) {
      return 25;
    }
    
    return 0;
  }

  private async checkDeviceRisk(fingerprint: string, userId?: string): Promise<number> {
    // Implementation would check device fingerprint against known devices
    return 0;
  }

  private async checkVelocityRisk(userId: string): Promise<number> {
    // Implementation would check activity velocity patterns
    return 0;
  }

  private sanitizeAuditData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'ssn', 'creditCard'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private calculateAuditRiskScore(entry: AuditLogEntry): number {
    let score = 0;

    // High-risk actions
    const highRiskActions = ['DELETE', 'TRANSFER_FUNDS', 'CHANGE_PASSWORD', 'BYPASS_2FA'];
    if (highRiskActions.includes(entry.action)) {
      score += 30;
    }

    // Sensitive resources
    const sensitiveResources = ['PAYMENT', 'KYC_DATA', 'ADMIN_SETTINGS'];
    if (sensitiveResources.includes(entry.resource)) {
      score += 20;
    }

    // Failed outcomes
    if (entry.outcome === 'FAILURE' || entry.outcome === 'DENIED') {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private requiresComplianceNotification(entry: AuditLogEntry): boolean {
    const complianceActions = [
      'KYC_APPROVED', 'KYC_REJECTED', 'AML_MATCH_FOUND', 'SAR_FILED',
      'LARGE_TRANSACTION', 'SUSPICIOUS_ACTIVITY', 'REGULATORY_BREACH'
    ];

    return complianceActions.includes(entry.action) || 
           (entry.metadata?.complianceFlags?.length || 0) > 0;
  }

  private async notifyComplianceTeam(entry: AuditLogEntry): Promise<void> {
    // Implementation would send notifications to compliance team
    logger.info('Compliance notification required', {
      action: entry.action,
      resource: entry.resource,
      complianceFlags: entry.metadata?.complianceFlags,
    });
  }

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store security event
      await prisma.complianceAlert.create({
        data: {
          alertType: event.type as any,
          severity: event.severity,
          title: event.type.replace(/_/g, ' '),
          description: event.description,
          details: event.details,
          status: 'OPEN',
          priority: event.severity === 'CRITICAL' ? 95 : (event.severity === 'HIGH' ? 75 : 50),
        },
      });

      // Immediate action for critical events
      if (event.requiresImmedateAction) {
        await this.handleCriticalSecurityEvent(event);
      }

      logger.warn('Security event logged', {
        type: event.type,
        severity: event.severity,
        source: event.source,
        requiresAction: event.requiresImmedateAction,
      });

    } catch (error) {
      logger.error('Security event logging failed', { event, error });
    }
  }

  private async handleCriticalSecurityEvent(event: SecurityEvent): Promise<void> {
    // Implementation would handle immediate response to critical events
    // e.g., block IPs, disable accounts, notify security team
    logger.error('CRITICAL SECURITY EVENT', {
      type: event.type,
      description: event.description,
      details: event.details,
    });
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();
