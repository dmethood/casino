import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const coolingOffSchema = z.object({
  duration: z.enum(['24H', '48H', '7D']),
  userId: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = coolingOffSchema.parse(body);

    // Verify user can only set cooling-off for themselves
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

    // Check if user is already in cooling-off or self-excluded
    if (rgProfile.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: `Cannot activate cooling-off: user status is ${rgProfile.status}` 
      }, { status: 400 });
    }

    // Calculate cooling-off end time
    let coolingOffUntil: Date;
    let coolingOffType: string;

    switch (duration) {
      case '24H':
        coolingOffUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        coolingOffType = 'COOLING_OFF_24H';
        break;
      case '48H':
        coolingOffUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
        coolingOffType = 'COOLING_OFF_72H'; // Using 72H enum value for 48H
        break;
      case '7D':
        coolingOffUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        coolingOffType = 'COOLING_OFF_7D';
        break;
      default:
        return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    // Update RG profile with cooling-off
    await prisma.responsibleGamblingProfile.update({
      where: { userId },
      data: {
        status: 'COOLING_OFF',
        coolingOffUntil,
        selfExclusionType: coolingOffType as any,
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
        endedAt: new Date()
      }
    });

    // Create RG alert
    await prisma.rgAlert.create({
      data: {
        rgProfileId: rgProfile.id,
        alertType: 'PATTERN_CONCERN',
        severity: 'MEDIUM',
        message: `User activated ${duration} cooling-off period`,
        triggered: true
      }
    });

    // Log the cooling-off activation
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'COOLING_OFF_ACTIVATED',
        resource: 'RESPONSIBLE_GAMBLING',
        resourceId: rgProfile.id,
        details: JSON.stringify({
          duration,
          coolingOffType,
          coolingOffUntil,
          jurisdiction: rgProfile.jurisdiction,
          voluntaryAction: true
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        outcome: 'SUCCESS'
      }
    });

    logger.info('Cooling-off period activated', {
      userId,
      userEmail: rgProfile.user.email,
      duration,
      coolingOffUntil,
      jurisdiction: rgProfile.jurisdiction
    });

    return NextResponse.json({
      success: true,
      coolingOffUntil,
      message: `Cooling-off period activated until ${coolingOffUntil.toLocaleDateString()}. You will be logged out.`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }

    logger.error('Error activating cooling-off', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
