// Mock geoip for local development
const geoip = {
  lookup: (ip: string) => {
    // Return mock data for local development
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: 'GB', region: 'ENG', city: 'London' };
    }
    return { country: 'GB', region: 'ENG', city: 'London' };
  }
};
import * as countryList from 'country-list';
const countries = countryList;
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

export interface JurisdictionInfo {
  countryCode: string;
  countryName: string;
  ip: string;
  isAllowed: boolean;
  isBlocked: boolean;
  hasActiveLicense: boolean;
  licenseInfo?: LicenseInfo[];
  restrictions?: JurisdictionRestrictions;
  complianceLevel: 'BLOCKED' | 'RESTRICTED' | 'ALLOWED' | 'FULLY_LICENSED';
}

export interface LicenseInfo {
  jurisdiction: string;
  licenseNumber: string;
  licenseType: 'CASINO' | 'SPORTS' | 'LOTTERY' | 'COMBINED';
  issuer: string;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  publicUrl?: string;
  verificationUrl?: string;
}

export interface JurisdictionRestrictions {
  maxDepositAmount?: number;
  maxBetAmount?: number;
  allowedGames?: string[];
  blockedGames?: string[];
  requiresAdditionalKYC?: boolean;
  rgRequirements?: ResponsibleGamblingRequirements;
  taxRate?: number;
  reportingRequirements?: string[];
}

export interface ResponsibleGamblingRequirements {
  mandatoryLimits?: boolean;
  realityCheckInterval?: number; // minutes
  sessionTimeLimit?: number; // minutes
  coolingOffMandatory?: boolean;
  selfExclusionMandatory?: boolean;
  lossLimitMandatory?: boolean;
  depositLimitMandatory?: boolean;
}

export interface GeoValidationResult {
  isValid: boolean;
  jurisdiction?: JurisdictionInfo;
  error?: string;
  blockReason?: string;
}

export interface KYCValidationResult {
  countryCode: string;
  documentCountry?: string;
  residencyCountry?: string;
  isConsistent: boolean;
  complianceLevel: 'BLOCKED' | 'RESTRICTED' | 'ALLOWED' | 'FULLY_LICENSED';
  error?: string;
}

class JurisdictionRulesEngine {
  private licenses: Map<string, LicenseInfo[]> = new Map();
  private allowedCountries: Set<string> = new Set();
  private blockedCountries: Set<string> = new Set();
  private jurisdictionRules: Map<string, JurisdictionRestrictions> = new Map();

  constructor() {
    this.initializeLicenses();
    this.initializeGeoRules();
    this.initializeJurisdictionRules();
  }

  /**
   * Initialize active licenses from environment
   */
  private initializeLicenses(): void {
    try {
      const licensesConfig = process.env.ACTIVE_LICENSES;
      if (!licensesConfig) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('No licenses configured - using development mode');
          this.activeLicenses = ['DEV-LICENSE-123'];
          return;
        } else {
          logger.error('No active licenses configured - platform cannot operate');
          throw new Error('FATAL: No active licenses configured');
        }
      }

      // Parse license configuration (comma-separated for local dev)
      const licenses = licensesConfig.split(',').map(license => ({
        jurisdiction: 'GB',
        licenseNumber: license.trim(),
        licenseType: 'CASINO',
        issuer: 'Development Authority',
        issuedDate: new Date(),
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        publicUrl: 'https://example.com',
        verificationUrl: 'https://example.com',
        conditions: []
      }));
      
      licenses.forEach(license => {
        if (!this.isLicenseValid(license)) {
          logger.error('Invalid license configuration', { license });
          throw new Error(`FATAL: Invalid license for ${license.jurisdiction}`);
        }

        if (!this.licenses.has(license.jurisdiction)) {
          this.licenses.set(license.jurisdiction, []);
        }
        this.licenses.get(license.jurisdiction)!.push(license);
        
        logger.info('License registered', {
          jurisdiction: license.jurisdiction,
          licenseNumber: license.licenseNumber,
          validUntil: license.validUntil
        });
      });

    } catch (error) {
      logger.error('Failed to initialize licenses', error);
      throw new Error('FATAL: License initialization failed');
    }
  }

  /**
   * Initialize geo-location rules
   */
  private initializeGeoRules(): void {
    try {
      const allowList = process.env.GEO_ALLOW_LIST?.split(',').map(c => c.trim()) || [];
      const blockList = process.env.GEO_BLOCK_LIST?.split(',').map(c => c.trim()) || [];

      // Validate that we have licenses for allowed countries
      allowList.forEach(country => {
        if (!this.licenses.has(country)) {
          logger.warn(`Country ${country} in allow list but no license found`);
        }
        this.allowedCountries.add(country);
      });

      blockList.forEach(country => {
        this.blockedCountries.add(country);
      });

      logger.info('Geo rules initialized', {
        allowedCountries: allowList.length,
        blockedCountries: blockList.length
      });

    } catch (error) {
      logger.error('Failed to initialize geo rules', error);
      throw new Error('FATAL: Geo rules initialization failed');
    }
  }

  /**
   * Initialize jurisdiction-specific rules
   */
  private initializeJurisdictionRules(): void {
    // UK Gambling Commission (UKGC) Requirements
    this.jurisdictionRules.set('GB', {
      maxDepositAmount: 200000, // £2000 in pence
      requiresAdditionalKYC: true,
      rgRequirements: {
        mandatoryLimits: true,
        realityCheckInterval: 60, // 1 hour
        sessionTimeLimit: 360, // 6 hours max
        coolingOffMandatory: true,
        selfExclusionMandatory: true,
        lossLimitMandatory: true,
        depositLimitMandatory: true
      },
      reportingRequirements: ['TRANSACTION_MONITORING', 'SAR_REPORTING', 'RG_STATS']
    });

    // Malta Gaming Authority (MGA) Requirements
    this.jurisdictionRules.set('MT', {
      maxDepositAmount: 500000, // €5000 in cents
      requiresAdditionalKYC: true,
      rgRequirements: {
        mandatoryLimits: false,
        realityCheckInterval: 120, // 2 hours
        coolingOffMandatory: false,
        selfExclusionMandatory: true
      },
      reportingRequirements: ['AML_REPORTING', 'PLAYER_PROTECTION']
    });

    // Curaçao eGaming Requirements
    this.jurisdictionRules.set('CW', {
      maxDepositAmount: 1000000, // $10,000 in cents
      requiresAdditionalKYC: false,
      rgRequirements: {
        mandatoryLimits: false,
        realityCheckInterval: 180, // 3 hours
        selfExclusionMandatory: true
      }
    });

    logger.info('Jurisdiction rules initialized', {
      jurisdictions: this.jurisdictionRules.size
    });
  }

  /**
   * Validate license configuration
   */
  private isLicenseValid(license: LicenseInfo): boolean {
    const now = new Date();
    return (
      license.licenseNumber &&
      license.jurisdiction &&
      license.validFrom <= now &&
      license.validUntil > now &&
      license.isActive
    );
  }

  /**
   * Get geo-location info from IP address
   */
  public getGeoLocationFromIP(ip: string): { country: string; error?: string } {
    try {
      // Handle local development
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        if (process.env.APP_ENV === 'production') {
          return { country: '', error: 'Invalid IP address for production' };
        }
        // Use test country for development
        return { country: process.env.DEV_TEST_COUNTRY || 'GB' };
      }

      const geo = geoip.lookup(ip);
      if (!geo) {
        logger.warn('Geo-location lookup failed', { ip });
        return { country: '', error: 'Geo-location lookup failed' };
      }

      return { country: geo.country };
    } catch (error) {
      logger.error('Geo-location error', { ip, error });
      return { country: '', error: 'Geo-location service error' };
    }
  }

  /**
   * Validate user jurisdiction based on IP and KYC data
   */
  public async validateJurisdiction(
    ip: string, 
    kycCountry?: string, 
    documentCountry?: string
  ): Promise<GeoValidationResult> {
    try {
      // Get IP-based location
      const geoResult = this.getGeoLocationFromIP(ip);
      if (geoResult.error || !geoResult.country) {
        return {
          isValid: false,
          error: geoResult.error || 'Could not determine location',
          blockReason: 'GEO_LOOKUP_FAILED'
        };
      }

      const countryCode = geoResult.country;
      const countryName = countries.getName(countryCode) || countryCode;

      // Check if country is explicitly blocked
      if (this.blockedCountries.has(countryCode)) {
        logger.warn('Access blocked - country in block list', { 
          countryCode, ip: this.sanitizeIP(ip) 
        });
        return {
          isValid: false,
          jurisdiction: {
            countryCode,
            countryName,
            ip: this.sanitizeIP(ip),
            isAllowed: false,
            isBlocked: true,
            hasActiveLicense: false,
            complianceLevel: 'BLOCKED'
          },
          blockReason: 'JURISDICTION_BLOCKED'
        };
      }

      // Check if country is in allow list
      if (!this.allowedCountries.has(countryCode)) {
        logger.warn('Access blocked - country not in allow list', { 
          countryCode, ip: this.sanitizeIP(ip) 
        });
        return {
          isValid: false,
          jurisdiction: {
            countryCode,
            countryName,
            ip: this.sanitizeIP(ip),
            isAllowed: false,
            isBlocked: false,
            hasActiveLicense: false,
            complianceLevel: 'BLOCKED'
          },
          blockReason: 'JURISDICTION_NOT_LICENSED'
        };
      }

      // Check for active licenses
      const licenses = this.licenses.get(countryCode) || [];
      const activeLicenses = licenses.filter(l => this.isLicenseValid(l));
      
      if (activeLicenses.length === 0) {
        logger.error('No active licenses for allowed country', { countryCode });
        return {
          isValid: false,
          jurisdiction: {
            countryCode,
            countryName,
            ip: this.sanitizeIP(ip),
            isAllowed: true,
            isBlocked: false,
            hasActiveLicense: false,
            complianceLevel: 'BLOCKED'
          },
          blockReason: 'NO_VALID_LICENSE'
        };
      }

      // Validate KYC consistency if provided
      if (kycCountry || documentCountry) {
        const kycValidation = this.validateKYCConsistency(
          countryCode, 
          kycCountry, 
          documentCountry
        );
        
        if (!kycValidation.isConsistent) {
          return {
            isValid: false,
            jurisdiction: {
              countryCode,
              countryName,
              ip: this.sanitizeIP(ip),
              isAllowed: true,
              isBlocked: false,
              hasActiveLicense: true,
              licenseInfo: activeLicenses,
              complianceLevel: 'BLOCKED'
            },
            blockReason: 'KYC_MISMATCH'
          };
        }
      }

      // All checks passed
      const complianceLevel = this.determineComplianceLevel(countryCode, activeLicenses);
      
      logger.info('Jurisdiction validation successful', {
        countryCode,
        complianceLevel,
        licenses: activeLicenses.length,
        ip: this.sanitizeIP(ip)
      });

      return {
        isValid: true,
        jurisdiction: {
          countryCode,
          countryName,
          ip: this.sanitizeIP(ip),
          isAllowed: true,
          isBlocked: false,
          hasActiveLicense: true,
          licenseInfo: activeLicenses,
          restrictions: this.jurisdictionRules.get(countryCode),
          complianceLevel
        }
      };

    } catch (error) {
      logger.error('Jurisdiction validation error', { ip: this.sanitizeIP(ip), error });
      return {
        isValid: false,
        error: 'Jurisdiction validation failed',
        blockReason: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate KYC document consistency with geo-location
   */
  private validateKYCConsistency(
    ipCountry: string, 
    kycCountry?: string, 
    documentCountry?: string
  ): KYCValidationResult {
    // Both IP and KYC must be in licensed jurisdictions
    const isIPAllowed = this.allowedCountries.has(ipCountry);
    const isKYCAllowed = !kycCountry || this.allowedCountries.has(kycCountry);
    const isDocAllowed = !documentCountry || this.allowedCountries.has(documentCountry);

    if (!isIPAllowed || !isKYCAllowed || !isDocAllowed) {
      return {
        countryCode: ipCountry,
        documentCountry,
        residencyCountry: kycCountry,
        isConsistent: false,
        complianceLevel: 'BLOCKED',
        error: 'One or more locations not in licensed jurisdictions'
      };
    }

    // For high-compliance jurisdictions, require exact match
    const highComplianceJurisdictions = ['GB', 'MT'];
    if (highComplianceJurisdictions.includes(ipCountry)) {
      const allCountriesMatch = (
        (!kycCountry || kycCountry === ipCountry) &&
        (!documentCountry || documentCountry === ipCountry)
      );

      if (!allCountriesMatch) {
        return {
          countryCode: ipCountry,
          documentCountry,
          residencyCountry: kycCountry,
          isConsistent: false,
          complianceLevel: 'BLOCKED',
          error: 'High-compliance jurisdiction requires exact location match'
        };
      }
    }

    return {
      countryCode: ipCountry,
      documentCountry,
      residencyCountry: kycCountry,
      isConsistent: true,
      complianceLevel: this.determineComplianceLevel(ipCountry, this.licenses.get(ipCountry) || [])
    };
  }

  /**
   * Determine compliance level based on jurisdiction and licenses
   */
  private determineComplianceLevel(
    countryCode: string, 
    licenses: LicenseInfo[]
  ): 'BLOCKED' | 'RESTRICTED' | 'ALLOWED' | 'FULLY_LICENSED' {
    if (licenses.length === 0) return 'BLOCKED';
    
    const hasFullLicense = licenses.some(l => 
      l.licenseType === 'CASINO' || l.licenseType === 'COMBINED'
    );
    
    if (hasFullLicense) {
      // Check if high-compliance jurisdiction
      const tier1Jurisdictions = ['GB', 'MT']; // UKGC, MGA
      return tier1Jurisdictions.includes(countryCode) ? 'FULLY_LICENSED' : 'ALLOWED';
    }

    return 'RESTRICTED';
  }

  /**
   * Get jurisdiction-specific restrictions
   */
  public getJurisdictionRestrictions(countryCode: string): JurisdictionRestrictions | null {
    return this.jurisdictionRules.get(countryCode) || null;
  }

  /**
   * Get all active licenses for a jurisdiction
   */
  public getLicensesForJurisdiction(countryCode: string): LicenseInfo[] {
    return this.licenses.get(countryCode)?.filter(l => this.isLicenseValid(l)) || [];
  }

  /**
   * Check if a specific game is allowed in a jurisdiction
   */
  public isGameAllowedInJurisdiction(countryCode: string, gameType: string): boolean {
    const restrictions = this.jurisdictionRules.get(countryCode);
    
    if (restrictions?.blockedGames?.includes(gameType)) {
      return false;
    }
    
    if (restrictions?.allowedGames && !restrictions.allowedGames.includes(gameType)) {
      return false;
    }
    
    return true;
  }

  /**
   * Record compliance check for audit
   */
  public async recordComplianceCheck(
    userId: string,
    ip: string,
    result: GeoValidationResult,
    additionalData?: any
  ): Promise<void> {
    try {
      await prisma.complianceLog.create({
        data: {
          userId,
          checkType: 'JURISDICTION_VALIDATION',
          ip: this.sanitizeIP(ip),
          result: result.isValid ? 'PASSED' : 'FAILED',
          details: JSON.stringify({
            jurisdiction: result.jurisdiction,
            blockReason: result.blockReason,
            ...additionalData
          }),
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to record compliance check', { userId, error });
    }
  }

  /**
   * Sanitize IP address for logging (GDPR compliance)
   */
  private sanitizeIP(ip: string): string {
    // Mask last octet for IPv4, last 64 bits for IPv6
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    } else if (ip.includes(':')) {
      const parts = ip.split(':');
      return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
    }
    return 'unknown';
  }

  /**
   * Get license verification URLs for public display
   */
  public getLicenseVerificationInfo(): Array<{
    jurisdiction: string;
    licenseNumber: string;
    issuer: string;
    publicUrl?: string;
    verificationUrl?: string;
  }> {
    const verificationInfo: Array<{
      jurisdiction: string;
      licenseNumber: string;
      issuer: string;
      publicUrl?: string;
      verificationUrl?: string;
    }> = [];

    this.licenses.forEach((licenses, jurisdiction) => {
      licenses.filter(l => this.isLicenseValid(l)).forEach(license => {
        verificationInfo.push({
          jurisdiction: license.jurisdiction,
          licenseNumber: license.licenseNumber,
          issuer: license.issuer,
          publicUrl: license.publicUrl,
          verificationUrl: license.verificationUrl
        });
      });
    });

    return verificationInfo;
  }

  /**
   * Emergency block jurisdiction (for regulatory compliance)
   */
  public emergencyBlockJurisdiction(countryCode: string, reason: string): void {
    this.blockedCountries.add(countryCode);
    logger.error('Emergency jurisdiction block activated', {
      countryCode,
      reason,
      timestamp: new Date().toISOString()
    });
    
    // This would typically trigger immediate notifications to compliance team
    // and potentially block all active sessions from this jurisdiction
  }
}

// Export singleton instance
export const jurisdictionEngine = new JurisdictionRulesEngine();
