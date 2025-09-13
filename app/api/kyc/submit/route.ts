import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { kycAMLSystem } from '@/lib/compliance/kyc-aml';
import { z } from 'zod';
import crypto from 'crypto';

const submitKYCSchema = z.object({
  userId: z.string(),
  documents: z.array(z.object({
    type: z.enum(['PASSPORT', 'DRIVING_LICENSE', 'NATIONAL_ID', 'UTILITY_BILL', 'BANK_STATEMENT']),
    country: z.string(),
    number: z.string().optional(),
    expiryDate: z.string().optional(),
    frontImage: z.string(), // Base64 encoded encrypted image
    backImage: z.string().optional() // Base64 encoded encrypted image
  })),
  selfie: z.string().optional(), // Base64 encoded encrypted selfie
  jurisdiction: z.string(),
  metadata: z.object({
    ipAddress: z.string(),
    userAgent: z.string(),
    timestamp: z.string(),
    livenessDetected: z.boolean().optional()
  })
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = submitKYCSchema.parse(body);

    // Verify user can only submit their own KYC
    if (session.user.id !== validatedData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, documents, selfie, jurisdiction, metadata } = validatedData;

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        kycProfile: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has approved KYC
    if (user.kycProfile?.approved) {
      return NextResponse.json({ 
        error: 'KYC already approved' 
      }, { status: 400 });
    }

    // Validate jurisdiction
    if (!['GB', 'MT', 'CW'].includes(jurisdiction)) { // Add other licensed jurisdictions
      return NextResponse.json({ 
        error: 'Jurisdiction not licensed for KYC processing' 
      }, { status: 400 });
    }

    // Get client IP for logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Store documents securely with encryption
    const encryptionKey = process.env.KYC_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('KYC encryption key not configured');
    }

    const storedDocuments = [];

    // Process each document
    for (const doc of documents) {
      const documentId = crypto.randomUUID();
      
      // Encrypt and store document images
      const frontImagePath = await storeEncryptedDocument(
        doc.frontImage, 
        documentId, 
        'front', 
        encryptionKey
      );
      
      let backImagePath = null;
      if (doc.backImage) {
        backImagePath = await storeEncryptedDocument(
          doc.backImage, 
          documentId, 
          'back', 
          encryptionKey
        );
      }

      // Create document record
      const kycDocument = await prisma.kycDocument.create({
        data: {
          kycProfileId: user.kycProfile?.id || '', // Will be created below if not exists
          documentType: doc.type,
          documentCountry: doc.country,
          documentNumber: doc.number ? encryptData(doc.number, encryptionKey) : null,
          frontImageUrl: encryptData(frontImagePath, encryptionKey),
          backImageUrl: backImagePath ? encryptData(backImagePath, encryptionKey) : null,
          verificationStatus: 'DOCUMENTS_SUBMITTED',
          submittedAt: new Date(),
          retentionUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
          provider: 'INTERNAL',
          providerId: documentId
        }
      });

      storedDocuments.push({
        id: kycDocument.id,
        type: doc.type,
        country: doc.country,
        frontImagePath,
        backImagePath
      });
    }

    // Store selfie if provided
    let selfieImagePath = null;
    if (selfie) {
      const selfieId = crypto.randomUUID();
      selfieImagePath = await storeEncryptedDocument(
        selfie,
        selfieId,
        'selfie',
        encryptionKey
      );

      await prisma.kycDocument.create({
        data: {
          kycProfileId: user.kycProfile?.id || '',
          documentType: 'SELFIE',
          documentCountry: jurisdiction,
          frontImageUrl: encryptData(selfieImagePath, encryptionKey),
          verificationStatus: 'DOCUMENTS_SUBMITTED',
          submittedAt: new Date(),
          retentionUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          provider: 'INTERNAL',
          providerId: selfieId,
          extractedData: metadata.livenessDetected ?
            encryptData(JSON.stringify({ livenessDetected: true }), encryptionKey) : undefined
        }
      });
    }

    // Create or update KYC profile
    let kycProfile;
    if (user.kycProfile) {
      kycProfile = await prisma.kycProfile.update({
        where: { id: user.kycProfile.id },
        data: {
          status: 'DOCUMENTS_SUBMITTED',
          jurisdiction,
          lastUpdated: new Date()
        }
      });
    } else {
      kycProfile = await prisma.kycProfile.create({
        data: {
          userId,
          status: 'DOCUMENTS_SUBMITTED',
          jurisdiction,
          tier: 'TIER_0',
          riskLevel: 'MEDIUM',
          documentsRequired: JSON.stringify(JSON.stringify(getRequiredDocuments(jurisdiction))),
          approved: false,
          lastUpdated: new Date()
        }
      });
    }

    // Create compliance alert for review
    await prisma.complianceAlert.create({
      data: {
        userId,
        alertType: 'KYC_REQUIRED',
        severity: 'MEDIUM',
        title: 'KYC Documents Submitted',
        description: `New KYC submission for review from ${jurisdiction}`,
        details: JSON.stringify({
          jurisdiction,
          documentCount: documents.length,
          hasSelfie: !!selfie,
          submissionId: kycProfile.id,
          clientIP,
          userAgent: metadata.userAgent
        }),
        status: 'OPEN'
      }
    });

    // Log the KYC submission
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'KYC_DOCUMENTS_SUBMITTED',
        resource: 'KYC_PROFILE',
        resourceId: kycProfile.id,
        details: JSON.stringify({
          jurisdiction,
          documentTypes: documents.map(d => d.type),
          documentCount: documents.length,
          hasSelfie: !!selfie,
          livenessDetected: metadata.livenessDetected,
          clientIP,
          userAgent: metadata.userAgent
        }),
        ipAddress: clientIP,
        userAgent: metadata.userAgent,
        outcome: 'SUCCESS'
      }
    });

    // Submit to external KYC provider for automated processing
    try {
      const kycSubmissionResult = await submitToKYCProvider({
        userId,
        userEmail: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        jurisdiction,
        documents: storedDocuments,
        selfieImagePath,
        metadata
      });

      // Update KYC profile with provider details
      if (kycSubmissionResult.verificationId) {
        await prisma.kycProfile.update({
          where: { id: kycProfile.id },
          data: {
            verificationId: kycSubmissionResult.verificationId,
            status: 'UNDER_REVIEW'
          }
        });
      }

    } catch (providerError) {
      logger.error('KYC provider submission failed', { 
        userId, 
        kycProfileId: kycProfile.id, 
        error: providerError 
      });
      
      // Continue with manual review if provider fails
      await prisma.kycProfile.update({
        where: { id: kycProfile.id },
        data: {
          status: 'UNDER_REVIEW',
          notes: ['Automated processing failed, manual review required']
        }
      });
    }

    logger.info('KYC documents submitted successfully', {
      userId,
      kycProfileId: kycProfile.id,
      jurisdiction,
      documentCount: documents.length,
      hasSelfie: !!selfie
    });

    return NextResponse.json({
      success: true,
      kycProfileId: kycProfile.id,
      status: 'DOCUMENTS_SUBMITTED',
      message: 'Documents submitted successfully and are under review',
      estimatedReviewTime: '1-3 business days'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }

    logger.error('KYC submission failed', { 
      // userId: removed for security, 
      error: error instanceof Error ? String(error) : error 
    });
    
    return NextResponse.json({ 
      error: 'Document submission failed. Please try again.' 
    }, { status: 500 });
  }
}

// Helper functions

async function storeEncryptedDocument(
  base64Data: string,
  documentId: string,
  type: string,
  encryptionKey: string
): Promise<string> {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:.*?;base64,/, '');
    
    // Convert base64 to buffer
    const documentBuffer = Buffer.from(base64Content, 'base64');
    
    // Encrypt the document
    const encryptedData = encryptData(documentBuffer.toString('base64'), encryptionKey);
    
    // In production, store to secure cloud storage (S3, Azure Blob, etc.)
    // For now, simulate storage path
    const storagePath = `kyc/${documentId}/${type}.enc`;
    
    // Here you would upload to your secure storage provider
    // await uploadToSecureStorage(storagePath, encryptedData);
    
    return storagePath;
    
  } catch (error) {
    logger.error('Failed to store encrypted document', { documentId, type, error });
    throw new Error('Document storage failed');
  }
}

function encryptData(data: string, key: string): string {
  const algorithm = 'aes-256-gcm';
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, keyBuffer);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

function getRequiredDocuments(jurisdiction: string): string[] {
  const baseDocuments = ['PASSPORT', 'NATIONAL_ID', 'DRIVING_LICENSE'];
  const proofOfAddress = ['UTILITY_BILL', 'BANK_STATEMENT'];

  switch (jurisdiction) {
    case 'GB': // UKGC requirements
      return [...baseDocuments, ...proofOfAddress, 'SELFIE'];
    case 'MT': // MGA requirements
      return [...baseDocuments, 'UTILITY_BILL', 'SELFIE'];
    default:
      return ['PASSPORT', 'SELFIE'];
  }
}

async function submitToKYCProvider(data: {
  userId: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  jurisdiction: string;
  documents: any[];
  selfieImagePath: string | null;
  metadata: any;
}): Promise<{ verificationId?: string; success: boolean }> {
  
  // In production, integrate with actual KYC provider
  const kycProviderUrl = process.env.KYC_PROVIDER_URL;
  const kycProviderKey = process.env.KYC_PROVIDER_API_KEY;
  
  if (!kycProviderUrl || !kycProviderKey) {
    logger.warn('KYC provider not configured, using manual review');
    return { success: false };
  }

  try {
    // Simulate KYC provider submission
    // In production, this would make actual API call to provider
    const verificationId = `kyc_${Date.now()}_${data.userId.substring(0, 8)}`;
    
    logger.info('KYC submitted to provider', {
      userId: data.userId,
      verificationId,
      jurisdiction: data.jurisdiction
    });

    return {
      verificationId,
      success: true
    };

  } catch (error) {
    logger.error('KYC provider submission failed', error);
    return { success: false };
  }
}
