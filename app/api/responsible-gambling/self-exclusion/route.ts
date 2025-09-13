import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const selfExclusionSchema = z.object({
  type: z.enum(['SELF_EXCLUSION']),
  duration: z.enum(['1M', '3M', '6M', 'PERMANENT']),
  userId: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = selfExclusionSchema.parse(body);

    // Verify user can only exclude themselves
    if (session.user.id !== validatedData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { duration, userId } = validatedData;

    // Get current RG profile
    const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!rgProfile) {
      return NextResponse.json({ error: 'RG profile not found' }, { status: 404 });
    }

    // Check if user is already self-excluded
    if (rgProfile.selfExcludedUntil && new Date(rgProfile.selfExcludedUntil) > new Date()) {
      return NextResponse.json({ 
        error: 'User is already self-excluded' 
      }, { status: 400 });
    }

    // Calculate exclusion end date
    let selfExcludedUntil: Date;
    let exclusionType: string;

    switch (duration) {
      case '1M':
        selfExcludedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        exclusionType = 'SELF_EXCLUSION_1M';
        break;
      case '3M':
        selfExcludedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        exclusionType = 'SELF_EXCLUSION_3M';
        break;
      case '6M':
        selfExcludedUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
        exclusionType = 'SELF_EXCLUSION_6M';
        break;
      case 'PERMANENT':
        selfExcludedUntil = new Date('2099-12-31'); // Far future date
        exclusionType = 'PERMANENT';
        break;
      default:
        return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    // Update RG profile with self-exclusion
    await prisma.responsibleGamblingProfile.update({
      where: { userId },
      data: {
        status: 'SELF_EXCLUDED',
        selfExcludedUntil,
        selfExclusionType: exclusionType as any,
        updatedAt: new Date()
      }
    });

    // Close any active gaming sessions
    await prisma.gamingSession.updateMany({
      where: {
        rgProfileId: rgProfile.id,
        endedAt: null
      },
      data: {
        endedAt: new Date(),
        duration: null // Will be calculated based on startedAt and endedAt
      }
    });

    // Create compliance alert for monitoring
    await prisma.complianceAlert.create({
      data: {
        userId,
        alertType: 'REGULATORY_BREACH',
        severity: 'HIGH',
        title: 'Self-Exclusion Activated',
        description: `User self-excluded for ${duration}`,
        details: JSON.stringify({
          exclusionType,
          selfExcludedUntil,
          jurisdiction: rgProfile.jurisdiction,
          userEmail: rgProfile.user.email
        }),
        status: 'OPEN'
      }
    });

    // Log the self-exclusion
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SELF_EXCLUSION_ACTIVATED',
        resource: 'RESPONSIBLE_GAMBLING',
        resourceId: rgProfile.id,
        details: JSON.stringify({
          duration,
          exclusionType,
          selfExcludedUntil,
          jurisdiction: rgProfile.jurisdiction,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        outcome: 'SUCCESS'
      }
    });

    // Send notification to compliance team
    logger.error('SELF-EXCLUSION ACTIVATED', {
      userId,
      userEmail: rgProfile.user.email,
      duration,
      exclusionType,
      selfExcludedUntil,
      jurisdiction: rgProfile.jurisdiction,
      timestamp: new Date().toISOString()
    });

    // For some jurisdictions, report to external self-exclusion databases
    if (rgProfile.jurisdiction === 'GB') {
      // In production, this would integrate with GAMSTOP
      logger.info('Self-exclusion should be reported to GAMSTOP', {
        userId,
        userEmail: rgProfile.user.email,
        duration,
        exclusionType
      });
    }

    return NextResponse.json({
      success: true,
      selfExcludedUntil,
      message: `Self-exclusion activated until ${selfExcludedUntil.toLocaleDateString()}. You will be logged out.`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }

    logger.error('Error activating self-exclusion', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
