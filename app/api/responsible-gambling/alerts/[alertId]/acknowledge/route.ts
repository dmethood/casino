import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    alertId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = params;
    const body = await request.json();
    const { userId } = body;

    // Verify user can only acknowledge their own alerts
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the alert and verify it belongs to the user
    const alert = await prisma.rgAlert.findUnique({
      where: { id: alertId },
      include: {
        rgProfile: {
          select: {
            userId: true,
            jurisdiction: true
          }
        }
      }
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (alert.rgProfile.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (alert.acknowledged) {
      return NextResponse.json({ error: 'Alert already acknowledged' }, { status: 400 });
    }

    // Acknowledge the alert
    await prisma.rgAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date()
      }
    });

    // Log the acknowledgment
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RG_ALERT_ACKNOWLEDGED',
        resource: 'RESPONSIBLE_GAMBLING_ALERT',
        resourceId: alertId,
        details: JSON.stringify({
          alertType: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          jurisdiction: alert.rgProfile.jurisdiction
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        outcome: 'SUCCESS'
      }
    });

    logger.info('RG alert acknowledged', {
      userId,
      alertId,
      alertType: alert.alertType,
      severity: alert.severity
    });

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });

  } catch (error) {
    logger.error('Error acknowledging RG alert', { alertId: params.alertId, error });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
