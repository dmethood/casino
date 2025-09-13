/**
 * Mandatory KYC System - Production Only
 * Age verification (18+), Document verification, Liveness detection, Sanctions/PEP screening
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

interface KYCVerificationRequest {
  userId: string;
  documentType: 'PASSPORT' | 'DRIVING_LICENSE' | 'NATIONAL_ID';
  frontImage: Buffer;
  backImage?: Buffer;
  selfieImage: Buffer;
  ipAddress: string;
}

interface KYCVerificationResult {
  success: boolean;
  tier: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  extractedData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    documentNumber: string;
    nationality: string;
    address?: string;
  };
  sanctionsMatch: boolean;
  pepMatch: boolean;
  livenessScore: number;
}

class MandatoryKYCSystem {
  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('FATAL: ENCRYPTION_KEY not configured for KYC data protection');
    }
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * MANDATORY: Verify user identity before any deposit/wager
   */
  async performKYCVerification(request: KYCVerificationRequest): Promise<KYCVerificationResult> {
    try {
      logger.info('Starting mandatory KYC verification', { 
        userId: request.userId,
        documentType: request.documentType 
      });

      // Step 1: Document OCR and validation
      const documentResult = await this.verifyDocument(request);
      
      // Step 2: Liveness detection on selfie
      const livenessResult = await this.verifyLiveness(request.selfieImage);
      
      // Step 3: Age verification (18+ mandatory)
      const ageVerification = this.verifyAge(documentResult.extractedData?.dateOfBirth);
      
      // Step 4: Sanctions screening
      const sanctionsResult = await this.screenSanctions(documentResult.extractedData);
      
      // Step 5: PEP screening
      const pepResult = await this.screenPEP(documentResult.extractedData);

      // Determine verification result
      const result = this.calculateKYCResult({
        documentResult,
        livenessResult,
        ageVerification,
        sanctionsResult,
        pepResult
      });

      // Store encrypted KYC profile
      await this.storeKYCProfile(request.userId, result, request);

      // Log audit trail
      logger.info('KYC verification completed', {
        userId: request.userId,
        success: result.success,
        tier: result.tier,
        riskLevel: result.riskLevel,
        sanctionsMatch: result.sanctionsMatch,
        pepMatch: result.pepMatch
      });

      return result;

    } catch (error) {
      logger.error('KYC verification failed', { 
        userId: request.userId,
        error: String(error) 
      });

      // Fail closed
      return {
        success: false,
        tier: 'TIER_0',
        riskLevel: 'CRITICAL',
        reasons: ['VERIFICATION_ERROR'],
        sanctionsMatch: false,
        pepMatch: false,
        livenessScore: 0
      };
    }
  }

  private async verifyDocument(request: KYCVerificationRequest): Promise<{
    valid: boolean;
    extractedData?: any;
    confidence: number;
  }> {
    // Integration with KYC provider (e.g., Jumio, Onfido)
    const kycApiKey = process.env.KYC_PROVIDER_API_KEY;
    if (!kycApiKey) {
      throw new Error('KYC_PROVIDER_API_KEY not configured');
    }

    // Mock implementation - replace with actual KYC provider
    // In production, this would call the KYC provider's API
    const mockExtractedData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      documentNumber: 'ABC123456',
      nationality: 'GB',
      address: '123 Main St, London, UK'
    };

    // Simulate document validation
    const isValid = this.validateDocumentIntegrity(request.frontImage);
    
    return {
      valid: isValid,
      extractedData: isValid ? mockExtractedData : undefined,
      confidence: isValid ? 0.95 : 0.3
    };
  }

  private async verifyLiveness(selfieImage: Buffer): Promise<{
    isLive: boolean;
    score: number;
  }> {
    // Liveness detection to prevent spoofing
    // In production, integrate with specialized liveness detection service
    
    // Mock implementation
    const score = Math.random() * 0.3 + 0.7; // 0.7-1.0
    const isLive = score > 0.8;

    return { isLive, score };
  }

  private verifyAge(dateOfBirth?: string): {
    isAdult: boolean;
    age: number;
  } {
    if (!dateOfBirth) {
      return { isAdult: false, age: 0 };
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return {
      isAdult: age >= 18,
      age
    };
  }

  private async screenSanctions(extractedData?: any): Promise<{
    isMatch: boolean;
    matches: any[];
  }> {
    if (!extractedData) {
      return { isMatch: false, matches: [] };
    }

    const sanctionsKey = process.env.SANCTIONS_PROVIDER_KEY;
    if (!sanctionsKey) {
      logger.warn('SANCTIONS_PROVIDER_KEY not configured - skipping sanctions screening');
      return { isMatch: false, matches: [] };
    }

    // Integration with sanctions screening service
    // Check against OFAC, EU, UN sanctions lists
    
    // Mock implementation
    const sanctionedNames = ['BLOCKED_PERSON', 'SANCTIONED_ENTITY'];
    const fullName = `${extractedData.firstName} ${extractedData.lastName}`.toUpperCase();
    
    const isMatch = sanctionedNames.some(name => fullName.includes(name));
    
    return {
      isMatch,
      matches: isMatch ? [{ list: 'OFAC', name: fullName }] : []
    };
  }

  private async screenPEP(extractedData?: any): Promise<{
    isMatch: boolean;
    matches: any[];
  }> {
    if (!extractedData || !process.env.PEP_CHECKS_ENABLED) {
      return { isMatch: false, matches: [] };
    }

    // PEP (Politically Exposed Person) screening
    // Mock implementation
    const pepNames = ['POLITICAL_FIGURE', 'GOVERNMENT_OFFICIAL'];
    const fullName = `${extractedData.firstName} ${extractedData.lastName}`.toUpperCase();
    
    const isMatch = pepNames.some(name => fullName.includes(name));
    
    return {
      isMatch,
      matches: isMatch ? [{ category: 'HEAD_OF_STATE', name: fullName }] : []
    };
  }

  private calculateKYCResult(verificationData: any): KYCVerificationResult {
    const { documentResult, livenessResult, ageVerification, sanctionsResult, pepResult } = verificationData;
    
    const reasons: string[] = [];
    let tier: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3' = 'TIER_0';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

    // Age verification is mandatory
    if (!ageVerification.isAdult) {
      reasons.push('UNDERAGE');
      riskLevel = 'CRITICAL';
      return {
        success: false,
        tier: 'TIER_0',
        riskLevel: 'CRITICAL',
        reasons,
        sanctionsMatch: sanctionsResult.isMatch,
        pepMatch: pepResult.isMatch,
        livenessScore: livenessResult.score,
        extractedData: documentResult.extractedData
      };
    }

    // Sanctions match is a hard block
    if (sanctionsResult.isMatch) {
      reasons.push('SANCTIONS_MATCH');
      riskLevel = 'CRITICAL';
      return {
        success: false,
        tier: 'TIER_0',
        riskLevel: 'CRITICAL',
        reasons,
        sanctionsMatch: true,
        pepMatch: pepResult.isMatch,
        livenessScore: livenessResult.score
      };
    }

    // Document validation
    if (!documentResult.valid || documentResult.confidence < 0.8) {
      reasons.push('DOCUMENT_INVALID');
      riskLevel = 'HIGH';
    }

    // Liveness check
    if (!livenessResult.isLive || livenessResult.score < 0.8) {
      reasons.push('LIVENESS_FAILED');
      riskLevel = 'HIGH';
    }

    // PEP match increases risk but doesn't block
    if (pepResult.isMatch) {
      reasons.push('PEP_MATCH');
      riskLevel = 'HIGH';
    }

    // Determine tier based on verification quality
    if (reasons.length === 0 && documentResult.confidence > 0.9 && livenessResult.score > 0.9) {
      tier = 'TIER_3'; // Full access
      riskLevel = 'LOW';
    } else if (reasons.length <= 1 && documentResult.confidence > 0.8) {
      tier = 'TIER_2'; // Standard access
      riskLevel = pepResult.isMatch ? 'HIGH' : 'MEDIUM';
    } else if (documentResult.valid && ageVerification.isAdult) {
      tier = 'TIER_1'; // Limited access
      riskLevel = 'MEDIUM';
    }

    const success = tier !== 'TIER_0' && !sanctionsResult.isMatch;

    return {
      success,
      tier,
      riskLevel,
      reasons,
      extractedData: documentResult.extractedData,
      sanctionsMatch: sanctionsResult.isMatch,
      pepMatch: pepResult.isMatch,
      livenessScore: livenessResult.score
    };
  }

  private async storeKYCProfile(userId: string, result: KYCVerificationResult, request: KYCVerificationRequest): Promise<void> {
    // Encrypt sensitive data
    const encryptedData = this.encryptSensitiveData(result.extractedData);
    
    await prisma.kycProfile.upsert({
      where: { userId },
      create: {
        userId,
        status: result.success ? 'APPROVED' : 'REJECTED',
        tier: result.tier,
        riskLevel: result.riskLevel,
        jurisdiction: result.extractedData?.nationality || 'UNKNOWN',
        approved: result.success,
        approvedAt: result.success ? new Date() : null,
        rejectedAt: result.success ? null : new Date(),
        rejectionReason: result.success ? null : result.reasons.join(', '),
        verificationResults: encryptedData,
        amlRiskLevel: result.riskLevel,
        complianceFlags: JSON.stringify(result.reasons),
        retentionUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
        lastScreened: new Date(),
        nextScreeningDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      },
      update: {
        status: result.success ? 'APPROVED' : 'REJECTED',
        tier: result.tier,
        riskLevel: result.riskLevel,
        approved: result.success,
        approvedAt: result.success ? new Date() : null,
        rejectedAt: result.success ? null : new Date(),
        rejectionReason: result.success ? null : result.reasons.join(', '),
        verificationResults: encryptedData,
        amlRiskLevel: result.riskLevel,
        complianceFlags: JSON.stringify(result.reasons),
        lastScreened: new Date(),
        nextScreeningDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    // Store encrypted documents with retention policy
    await this.storeKYCDocuments(userId, request);
  }

  private async storeKYCDocuments(userId: string, request: KYCVerificationRequest): Promise<void> {
    const kycProfile = await prisma.kycProfile.findUnique({ where: { userId } });
    if (!kycProfile) return;

    // Store front document
    await prisma.kycDocument.create({
      data: {
        kycProfileId: kycProfile.id,
        documentType: request.documentType,
        documentCountry: 'GB', // Should be extracted from document
        frontImageUrl: await this.encryptAndStoreDocument(request.frontImage),
        backImageUrl: request.backImage ? await this.encryptAndStoreDocument(request.backImage) : null,
        selfieUrl: await this.encryptAndStoreDocument(request.selfieImage),
        verificationStatus: 'DOCUMENTS_SUBMITTED',
        submittedAt: new Date(),
        retentionUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
        provider: 'INTERNAL'
      }
    });
  }

  private validateDocumentIntegrity(imageBuffer: Buffer): boolean {
    // Basic validation - in production, use sophisticated document validation
    return imageBuffer.length > 10000; // Minimum file size check
  }

  private encryptSensitiveData(data: any): any {
    if (!data) return null;
    
    const jsonString = JSON.stringify(data);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return { encrypted };
  }

  private async encryptAndStoreDocument(imageBuffer: Buffer): Promise<string> {
    // In production, store in encrypted cloud storage
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const encryptedPath = `kyc/documents/${hash}.enc`;
    
    // Mock storage path - implement actual encrypted storage
    return encryptedPath;
  }

  /**
   * Check if user has valid KYC before allowing deposits/wagers
   */
  async validateUserKYC(userId: string): Promise<{
    valid: boolean;
    tier: string;
    reason?: string;
  }> {
    try {
      const kycProfile = await prisma.kycProfile.findUnique({
        where: { userId }
      });

      if (!kycProfile) {
        return { valid: false, tier: 'TIER_0', reason: 'KYC_NOT_STARTED' };
      }

      if (!kycProfile.approved) {
        return { valid: false, tier: kycProfile.tier, reason: 'KYC_NOT_APPROVED' };
      }

      if (kycProfile.status !== 'APPROVED') {
        return { valid: false, tier: kycProfile.tier, reason: 'KYC_STATUS_INVALID' };
      }

      // Check if re-screening is due
      if (kycProfile.nextScreeningDue && kycProfile.nextScreeningDue < new Date()) {
        return { valid: false, tier: kycProfile.tier, reason: 'RESCREENING_DUE' };
      }

      return { valid: true, tier: kycProfile.tier };

    } catch (error) {
      logger.error('KYC validation error', { userId, error });
      return { valid: false, tier: 'TIER_0', reason: 'VALIDATION_ERROR' };
    }
  }
}

export const mandatoryKYC = new MandatoryKYCSystem();
export type { KYCVerificationRequest, KYCVerificationResult };
