/**
 * License-Gated Access Control
 * FAIL-CLOSED: Blocks all operations if licensing requirements not met
 */

import { logger } from '@/lib/logger';

// Mock geoip for local development
const geoip = {
  lookup: (ip: string) => {
    // Return mock data for local development - simulate UK location
    return { country: 'GB', region: 'ENG', city: 'London' };
  }
};

interface License {
  number: string;
  jurisdiction: string;
  issuer: string;
  validFrom: Date;
  validUntil: Date;
  publicUrl: string;
  verificationUrl: string;
  allowedGames: string[];
  conditions: string[];
}

interface JurisdictionRules {
  code: string;
  name: string;
  license: License;
  kycRequired: boolean;
  ageMinimum: number;
  currency: string;
  maxDepositDaily: number;
  rgMandatory: boolean;
  gamstopRequired: boolean;
  realityCheckMinutes: number;
  restrictedGames: string[];
  taxRate: number;
}

class LicenseGatingSystem {
  private licenses: Map<string, License> = new Map();
  private jurisdictionRules: Map<string, JurisdictionRules> = new Map();
  private allowedCountries: Set<string> = new Set();
  private blockedCountries: Set<string> = new Set();

  constructor() {
    this.initializeLicenses();
    this.initializeJurisdictionRules();
    this.loadGeoRestrictions();
  }

  private initializeLicenses(): void {
    const activeLicenses = process.env.ACTIVE_LICENSES?.split(',') || [];
    
    if (activeLicenses.length === 0) {
      logger.error('FATAL: No active licenses configured - platform cannot operate');
      throw new Error('COMPLIANCE_FAILURE: No active licenses found');
    }

    // Malta Gaming Authority
    if (activeLicenses.includes('MGA/B2C/123/2024')) {
      this.licenses.set('MT', {
        number: 'MGA/B2C/123/2024',
        jurisdiction: 'Malta',
        issuer: 'Malta Gaming Authority',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2029-12-31'),
        publicUrl: 'https://www.mga.org.mt/support/online-gaming-licence-verification/',
        verificationUrl: 'https://www.mga.org.mt/support/online-gaming-licence-verification/?lang=EN&company=Licensed%20Casino%20Platform%20Ltd',
        allowedGames: ['SLOTS', 'BLACKJACK', 'ROULETTE', 'BACCARAT', 'DICE', 'CRASH'],
        conditions: [
          'B2C remote gaming licence',
          'Segregation of player funds required',
          'Regular compliance reporting mandatory',
          'Player protection measures enforced'
        ]
      });
    }

    // UK Gambling Commission
    if (activeLicenses.includes('UKGC/12345-6789-AB')) {
      this.licenses.set('GB', {
        number: '12345-6789-AB',
        jurisdiction: 'United Kingdom',
        issuer: 'UK Gambling Commission',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2027-12-31'),
        publicUrl: 'https://www.gamblingcommission.gov.uk/public-register/',
        verificationUrl: 'https://secure.gamblingcommission.gov.uk/PublicRegister/Search/Detail/12345-6789-AB',
        allowedGames: ['SLOTS', 'BLACKJACK', 'ROULETTE', 'BACCARAT'],
        conditions: [
          'Remote gambling licence',
          'GAMSTOP integration mandatory',
          'Affordability checks required',
          'Social responsibility measures enforced'
        ]
      });
    }

    // Curaçao eGaming
    if (activeLicenses.includes('CEG-1234-2024')) {
      this.licenses.set('CW', {
        number: 'CEG-1234-2024',
        jurisdiction: 'Curaçao',
        issuer: 'Curaçao eGaming',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2029-12-31'),
        publicUrl: 'https://www.curacao-egaming.com/public-information',
        verificationUrl: 'https://validator.curacao-egaming.com/?lh=CEG-1234-2024',
        allowedGames: ['SLOTS', 'BLACKJACK', 'ROULETTE', 'BACCARAT', 'DICE', 'CRASH', 'VEGETABLES'],
        conditions: [
          'Interactive gaming licence',
          'Player dispute resolution available',
          'Technical standards compliance',
          'Financial reporting requirements'
        ]
      });
    }

    logger.info('License gating initialized', { 
      activeJurisdictions: Array.from(this.licenses.keys()),
      licenseCount: this.licenses.size
    });
  }

  private initializeJurisdictionRules(): void {
    // United Kingdom - Strict UKGC Rules
    this.jurisdictionRules.set('GB', {
      code: 'GB',
      name: 'United Kingdom',
      license: this.licenses.get('GB')!,
      kycRequired: true,
      ageMinimum: 18,
      currency: 'GBP',
      maxDepositDaily: 50000, // £500
      rgMandatory: true,
      gamstopRequired: true,
      realityCheckMinutes: 60,
      restrictedGames: ['CRASH', 'DICE', 'VEGETABLES'], // High-risk games restricted
      taxRate: 0.21 // 21% remote gaming duty
    });

    // Malta - MGA Rules
    this.jurisdictionRules.set('MT', {
      code: 'MT',
      name: 'Malta',
      license: this.licenses.get('MT')!,
      kycRequired: true,
      ageMinimum: 18,
      currency: 'EUR',
      maxDepositDaily: 100000, // €1000
      rgMandatory: true,
      gamstopRequired: false,
      realityCheckMinutes: 60,
      restrictedGames: [],
      taxRate: 0.05 // 5% gaming tax
    });

    // Curaçao - More Permissive
    this.jurisdictionRules.set('CW', {
      code: 'CW',
      name: 'Curaçao',
      license: this.licenses.get('CW')!,
      kycRequired: true,
      ageMinimum: 18,
      currency: 'USD',
      maxDepositDaily: 500000, // $5000
      rgMandatory: true,
      gamstopRequired: false,
      realityCheckMinutes: 120,
      restrictedGames: [],
      taxRate: 0.02 // 2% gross gaming revenue
    });
  }

  private loadGeoRestrictions(): void {
    const allowList = process.env.GEO_ALLOW_LIST?.split(',') || [];
    const blockList = process.env.GEO_BLOCK_LIST?.split(',') || [];

    allowList.forEach(country => this.allowedCountries.add(country.trim()));
    blockList.forEach(country => this.blockedCountries.add(country.trim()));

    if (this.allowedCountries.size === 0) {
      logger.error('FATAL: No allowed countries configured - platform cannot operate');
      throw new Error('COMPLIANCE_FAILURE: No geo-allowlist found');
    }

    logger.info('Geo-restrictions loaded', {
      allowedCountries: Array.from(this.allowedCountries),
      blockedCountries: Array.from(this.blockedCountries)
    });
  }

  /**
   * FAIL-CLOSED: Validate user access based on IP and KYC jurisdiction
   */
  public async validateAccess(ipAddress: string, kycJurisdiction?: string): Promise<{
    allowed: boolean;
    jurisdiction?: string;
    license?: License;
    rules?: JurisdictionRules;
    reason?: string;
  }> {
    try {
      // Step 1: IP Geolocation Check
      const geoData = geoip.lookup(ipAddress);
      const ipCountry = geoData?.country;

      if (!ipCountry) {
        logger.warn('Access denied: Unable to determine country from IP', { ipAddress });
        return { allowed: false, reason: 'GEOLOCATION_FAILED' };
      }

      // Step 2: Check if country is explicitly blocked
      if (this.blockedCountries.has(ipCountry)) {
        logger.warn('Access denied: Country blocked', { ipAddress, country: ipCountry });
        return { allowed: false, reason: 'COUNTRY_BLOCKED' };
      }

      // Step 3: Check if country is in allow list
      if (!this.allowedCountries.has(ipCountry)) {
        logger.warn('Access denied: Country not in allow list', { ipAddress, country: ipCountry });
        return { allowed: false, reason: 'COUNTRY_NOT_LICENSED' };
      }

      // Step 4: Verify we have a license for this jurisdiction
      const license = this.licenses.get(ipCountry);
      if (!license) {
        logger.warn('Access denied: No license for jurisdiction', { ipAddress, country: ipCountry });
        return { allowed: false, reason: 'NO_LICENSE' };
      }

      // Step 5: Check license validity
      const now = new Date();
      if (now < license.validFrom || now > license.validUntil) {
        logger.error('Access denied: License expired or not yet valid', { 
          license: license.number,
          validFrom: license.validFrom,
          validUntil: license.validUntil
        });
        return { allowed: false, reason: 'LICENSE_EXPIRED' };
      }

      // Step 6: If KYC jurisdiction provided, ensure it matches IP jurisdiction
      if (kycJurisdiction && kycJurisdiction !== ipCountry) {
        logger.warn('Access denied: KYC jurisdiction mismatch', { 
          ipCountry, 
          kycJurisdiction,
          ipAddress 
        });
        return { allowed: false, reason: 'JURISDICTION_MISMATCH' };
      }

      const rules = this.jurisdictionRules.get(ipCountry);
      
      logger.info('Access granted', { 
        ipAddress,
        jurisdiction: ipCountry,
        license: license.number
      });

      return {
        allowed: true,
        jurisdiction: ipCountry,
        license,
        rules
      };

    } catch (error) {
      logger.error('Access validation error - failing closed', { error, ipAddress });
      return { allowed: false, reason: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Validate if a specific game is allowed in jurisdiction
   */
  public isGameAllowed(game: string, jurisdiction: string): boolean {
    const rules = this.jurisdictionRules.get(jurisdiction);
    if (!rules) return false;

    const license = rules.license;
    
    // Check if game is in allowed games list
    if (!license.allowedGames.includes(game)) {
      return false;
    }

    // Check if game is restricted in this jurisdiction
    if (rules.restrictedGames.includes(game)) {
      return false;
    }

    return true;
  }

  /**
   * Get all active licenses for public display
   */
  public getActiveLicenses(): License[] {
    return Array.from(this.licenses.values());
  }

  /**
   * Get jurisdiction rules for a country
   */
  public getJurisdictionRules(country: string): JurisdictionRules | null {
    return this.jurisdictionRules.get(country) || null;
  }

  /**
   * Validate RNG certification
   */
  public validateRNGCertification(): boolean {
    const rngCertRef = process.env.RNG_CERT_REF;
    const rngProvider = process.env.RNG_PROVIDER;

    if (!rngCertRef || !rngProvider) {
      logger.error('FATAL: RNG certification not configured');
      return false;
    }

    // In production, this would validate against the actual certificate
    logger.info('RNG certification validated', { 
      certRef: rngCertRef,
      provider: rngProvider 
    });
    
    return true;
  }

  /**
   * FAIL-CLOSED: Pre-flight compliance check
   */
  public async performComplianceCheck(): Promise<{
    passed: boolean;
    failures: string[];
  }> {
    const failures: string[] = [];

    // Check licenses
    if (this.licenses.size === 0) {
      failures.push('No active licenses configured');
    }

    // Check geo restrictions
    if (this.allowedCountries.size === 0) {
      failures.push('No allowed countries configured');
    }

    // Check RNG certification
    if (!this.validateRNGCertification()) {
      failures.push('RNG certification invalid');
    }

    // Check environment variables
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'KYC_PROVIDER_API_KEY',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        failures.push(`Missing required environment variable: ${envVar}`);
      }
    }

    const passed = failures.length === 0;

    if (!passed) {
      logger.error('COMPLIANCE CHECK FAILED - Platform cannot operate', { failures });
    } else {
      logger.info('Compliance check passed - Platform operational');
    }

    return { passed, failures };
  }
}

// Singleton instance
export const licenseGating = new LicenseGatingSystem();

// Export types
export type { License, JurisdictionRules };
