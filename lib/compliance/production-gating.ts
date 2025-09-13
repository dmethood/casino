/**
 * PRODUCTION-ONLY COMPLIANCE GATING SYSTEM
 * FAIL-CLOSED: Blocks ALL operations if compliance requirements not met
 */

import { logger } from '@/lib/logger';

interface ComplianceValidation {
  passed: boolean;
  failures: string[];
  criticalFailures: string[];
  warnings: string[];
}

interface LicenseValidation {
  jurisdiction: string;
  licenseNumber: string;
  issuer: string;
  validUntil: Date;
  isValid: boolean;
  publicVerificationUrl: string;
}

class ProductionComplianceGating {
  private static instance: ProductionComplianceGating;
  private complianceStatus: ComplianceValidation | null = null;
  private lastValidation: Date | null = null;
  private validationInterval = 5 * 60 * 1000; // 5 minutes

  constructor() {
    if (ProductionComplianceGating.instance) {
      return ProductionComplianceGating.instance;
    }
    ProductionComplianceGating.instance = this;
  }

  /**
   * CRITICAL: Platform-wide compliance validation
   * MUST PASS before any real-money operations
   */
  async validatePlatformCompliance(): Promise<ComplianceValidation> {
    // Cache validation for 5 minutes to avoid excessive checks
    if (this.complianceStatus && this.lastValidation && 
        Date.now() - this.lastValidation.getTime() < this.validationInterval) {
      return this.complianceStatus;
    }

    const failures: string[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];

    // 1. LICENSING VALIDATION
    const licenseValidation = await this.validateLicensing();
    if (!licenseValidation.passed) {
      criticalFailures.push(...licenseValidation.failures);
    }

    // 2. ENVIRONMENT VALIDATION
    const envValidation = this.validateEnvironment();
    if (!envValidation.passed) {
      criticalFailures.push(...envValidation.failures);
    }

    // 3. SECURITY VALIDATION
    const securityValidation = this.validateSecurity();
    if (!securityValidation.passed) {
      criticalFailures.push(...securityValidation.failures);
    }

    // 4. PAYMENT VALIDATION
    const paymentValidation = this.validatePaymentSystems();
    if (!paymentValidation.passed) {
      criticalFailures.push(...paymentValidation.failures);
    }

    // 5. KYC/AML VALIDATION
    const kycValidation = this.validateKYCAML();
    if (!kycValidation.passed) {
      criticalFailures.push(...kycValidation.failures);
    }

    // 6. RNG VALIDATION
    const rngValidation = this.validateRNG();
    if (!rngValidation.passed) {
      criticalFailures.push(...rngValidation.failures);
    }

    const passed = criticalFailures.length === 0;
    
    this.complianceStatus = {
      passed,
      failures: [...failures, ...criticalFailures],
      criticalFailures,
      warnings
    };
    this.lastValidation = new Date();

    if (!passed) {
      logger.error('PLATFORM COMPLIANCE FAILURE - BLOCKING ALL OPERATIONS', {
        criticalFailures,
        totalFailures: criticalFailures.length
      });
    } else {
      logger.info('Platform compliance validation passed', {
        checksPerformed: 6,
        warnings: warnings.length
      });
    }

    return this.complianceStatus;
  }

  private async validateLicensing(): Promise<{ passed: boolean; failures: string[] }> {
    const failures: string[] = [];

    // Check active licenses configured
    const activeLicenses = process.env.ACTIVE_LICENSES?.split(',') || [];
    if (activeLicenses.length === 0) {
      failures.push('CRITICAL: No active licenses configured in ACTIVE_LICENSES');
    }

    // Validate each license
    for (const license of activeLicenses) {
      const licenseValidation = await this.validateSpecificLicense(license.trim());
      if (!licenseValidation.isValid) {
        failures.push(`CRITICAL: Invalid license ${license}`);
      }
    }

    // Check geo-allowlist
    const allowList = process.env.GEO_ALLOW_LIST?.split(',') || [];
    if (allowList.length === 0) {
      failures.push('CRITICAL: No geo-allowlist configured in GEO_ALLOW_LIST');
    }

    // Verify license display is enabled
    if (process.env.LICENSE_DISPLAY_ENABLED !== 'true') {
      failures.push('CRITICAL: License display not enabled');
    }

    return { passed: failures.length === 0, failures };
  }

  private async validateSpecificLicense(licenseNumber: string): Promise<LicenseValidation> {
    // Validate license format and jurisdiction
    if (licenseNumber.startsWith('MGA/B2C/')) {
      return {
        jurisdiction: 'MT',
        licenseNumber,
        issuer: 'Malta Gaming Authority',
        validUntil: new Date('2029-12-31'),
        isValid: this.isLicenseNumberValid(licenseNumber),
        publicVerificationUrl: 'https://www.mga.org.mt/support/online-gaming-licence-verification/'
      };
    } else if (licenseNumber.includes('-') && licenseNumber.length > 10) {
      return {
        jurisdiction: 'GB',
        licenseNumber,
        issuer: 'UK Gambling Commission',
        validUntil: new Date('2027-12-31'),
        isValid: this.isLicenseNumberValid(licenseNumber),
        publicVerificationUrl: 'https://www.gamblingcommission.gov.uk/public-register/'
      };
    } else if (licenseNumber.startsWith('CEG-')) {
      return {
        jurisdiction: 'CW',
        licenseNumber,
        issuer: 'Curaçao eGaming',
        validUntil: new Date('2029-12-31'),
        isValid: this.isLicenseNumberValid(licenseNumber),
        publicVerificationUrl: 'https://validator.curacao-egaming.com/'
      };
    }

    return {
      jurisdiction: 'UNKNOWN',
      licenseNumber,
      issuer: 'UNKNOWN',
      validUntil: new Date(),
      isValid: false,
      publicVerificationUrl: ''
    };
  }

  private isLicenseNumberValid(licenseNumber: string): boolean {
    // In production, this would validate against actual regulatory databases
    // For now, validate format
    return licenseNumber.length > 5 && !licenseNumber.includes('test') && !licenseNumber.includes('demo');
  }

  private validateEnvironment(): { passed: boolean; failures: string[] } {
    const failures: string[] = [];
    
    // Critical environment variables that MUST be set for production
    const criticalEnvVars = [
      'APP_ENV',
      'BASE_URL',
      'JWT_SECRET',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY',
      'DATABASE_URL',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'KYC_PROVIDER_API_KEY',
      'SANCTIONS_PROVIDER_KEY',
      'ACTIVE_LICENSES',
      'GEO_ALLOW_LIST'
    ];

    for (const envVar of criticalEnvVars) {
      if (!process.env[envVar]) {
        failures.push(`CRITICAL: Missing required environment variable: ${envVar}`);
      }
    }

    // Validate APP_ENV is production
    if (process.env.APP_ENV !== 'production') {
      failures.push('CRITICAL: APP_ENV must be set to "production"');
    }

    // Check for test/demo values in production keys
    const productionKeys = ['STRIPE_SECRET_KEY', 'KYC_PROVIDER_API_KEY', 'SANCTIONS_PROVIDER_KEY'];
    for (const key of productionKeys) {
      const value = process.env[key]?.toLowerCase() || '';
      if (value.includes('test') || value.includes('demo') || value.includes('sandbox')) {
        failures.push(`CRITICAL: ${key} contains test/demo value - production keys required`);
      }
    }

    return { passed: failures.length === 0, failures };
  }

  private validateSecurity(): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      failures.push('CRITICAL: JWT_SECRET must be at least 32 characters');
    }

    // Encryption key strength
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length < 64) {
      failures.push('CRITICAL: ENCRYPTION_KEY must be at least 64 characters for AES-256');
    }

    // Admin 2FA enforcement
    if (process.env.ADMIN_2FA_ENFORCED !== 'true') {
      failures.push('CRITICAL: Admin 2FA must be enforced (ADMIN_2FA_ENFORCED=true)');
    }

    // Audit log immutability
    if (process.env.AUDIT_LOG_IMMUTABLE !== 'true') {
      failures.push('CRITICAL: Audit logs must be immutable (AUDIT_LOG_IMMUTABLE=true)');
    }

    return { passed: failures.length === 0, failures };
  }

  private validatePaymentSystems(): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // Stripe production validation
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      failures.push('CRITICAL: STRIPE_SECRET_KEY not configured');
    } else if (!stripeKey.startsWith('sk_live_')) {
      failures.push('CRITICAL: STRIPE_SECRET_KEY must be live key (sk_live_...)');
    }

    // Webhook secret
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      failures.push('CRITICAL: STRIPE_WEBHOOK_SECRET not configured');
    }

    // 3D Secure enforcement
    if (process.env.PAYMENT_3DS_REQUIRED_THRESHOLD === undefined) {
      failures.push('CRITICAL: 3D Secure threshold not configured');
    }

    return { passed: failures.length === 0, failures };
  }

  private validateKYCAML(): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // KYC provider
    if (!process.env.KYC_PROVIDER_API_KEY) {
      failures.push('CRITICAL: KYC_PROVIDER_API_KEY not configured');
    }

    // Sanctions screening
    if (!process.env.SANCTIONS_PROVIDER_KEY) {
      failures.push('CRITICAL: SANCTIONS_PROVIDER_KEY not configured');
    }

    // PEP screening
    if (process.env.PEP_CHECKS_ENABLED !== 'true') {
      failures.push('CRITICAL: PEP checks must be enabled');
    }

    // Document encryption
    if (!process.env.KYC_ENCRYPTION_KEY) {
      failures.push('CRITICAL: KYC_ENCRYPTION_KEY not configured for document protection');
    }

    return { passed: failures.length === 0, failures };
  }

  private validateRNG(): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // RNG certification
    if (!process.env.RNG_CERT_REF) {
      failures.push('CRITICAL: RNG_CERT_REF not configured');
    }

    // RNG provider
    if (!process.env.RNG_CERT_ISSUER) {
      failures.push('CRITICAL: RNG_CERT_ISSUER not configured');
    }

    // Provably fair enabled
    if (process.env.PROVABLY_FAIR_ENABLED !== 'true') {
      failures.push('CRITICAL: Provably fair must be enabled');
    }

    return { passed: failures.length === 0, failures };
  }

  /**
   * FAIL-CLOSED: Check if platform can operate
   */
  async canPlatformOperate(): Promise<boolean> {
    const validation = await this.validatePlatformCompliance();
    return validation.passed;
  }

  /**
   * Get compliance status for admin dashboard
   */
  async getComplianceStatus(): Promise<ComplianceValidation> {
    return await this.validatePlatformCompliance();
  }

  /**
   * Force compliance re-validation
   */
  forceRevalidation(): void {
    this.complianceStatus = null;
    this.lastValidation = null;
  }
}

// Singleton instance
export const productionGating = new ProductionComplianceGating();

// Export types
export type { ComplianceValidation, LicenseValidation };
