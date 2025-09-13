import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const updateLimitSchema = z.object({
  type: z.enum(['deposit', 'loss', 'time']),
  period: z.string(),
  value: z.number().min(0),
  userId: z.string()
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateLimitSchema.parse(body);

    // Verify user can only update their own limits
    if (session.user.id !== validatedData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { type, period, value, userId } = validatedData;

    // Get current RG profile
    const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
      where: { userId }
    });

    if (!rgProfile) {
      return NextResponse.json({ error: 'RG profile not found' }, { status: 404 });
    }

    // Check if user is in cooling-off or self-excluded
    if (rgProfile.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Cannot update limits during cooling-off or self-exclusion period' 
      }, { status: 400 });
    }

    // Build field name for update
    let fieldName: string;
    if (type === 'deposit') {
      fieldName = `${period}DepositLimit`;
    } else if (type === 'loss') {
      fieldName = `${period}LossLimit`;
    } else if (type === 'time') {
      if (period === 'realityCheck') {
        fieldName = 'realityCheckInterval';
      } else {
        fieldName = `${period}Limit`; // dailyTimeLimit, sessionTimeLimit
      }
    } else {
      return NextResponse.json({ error: 'Invalid limit type' }, { status: 400 });
    }

    // Get current value
    const currentValue = (rgProfile as any)[fieldName] || 0;
    const isIncrease = value > currentValue;

    // Check jurisdiction requirements for cooling-off on increases
    const highComplianceJurisdictions = ['GB', 'MT'];
    const requiresCoolingOff = isIncrease && 
      highComplianceJurisdictions.includes(rgProfile.jurisdiction || 'DEFAULT') && 
      type !== 'time'; // Time limits don't require cooling-off

    let coolingOffUntil = null;
    if (requiresCoolingOff) {
      coolingOffUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    // Update the limit
    const updateData: any = {
      [fieldName]: value,
      updatedAt: new Date()
    };

    if (coolingOffUntil) {
      updateData.coolingOffUntil = coolingOffUntil;
      updateData.status = 'COOLING_OFF';
    }

    await prisma.responsibleGamblingProfile.update({
      where: { userId },
      data: updateData
    });

    // Log the limit change
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RG_LIMIT_UPDATE',
        resource: 'RESPONSIBLE_GAMBLING',
        resourceId: rgProfile.id,
        details: JSON.stringify({
          limitType: type,
          limitPeriod: period,
          oldValue: currentValue,
          newValue: value,
          isIncrease,
          coolingOffUntil,
          jurisdiction: rgProfile.jurisdiction
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        outcome: 'SUCCESS'
      }
    });

    // Create RG alert if this is a significant increase
    if (isIncrease && (value > currentValue * 2 || value > 500)) { // 2x increase or >$500
      await prisma.rgAlert.create({
        data: {
          rgProfileId: rgProfile.id,
          alertType: 'PATTERN_CONCERN',
          severity: 'MEDIUM',
          message: `${type} limit increased significantly from ${currentValue} to ${value}`,
          triggered: true
        }
      });
    }

    logger.info('RG limit updated', {
      userId,
      type,
      period,
      oldValue: currentValue,
      newValue: value,
      coolingOff: !!coolingOffUntil
    });

    return NextResponse.json({
      success: true,
      coolingOffUntil,
      message: coolingOffUntil ? 
        'Limit will be updated after 24-hour cooling-off period' : 
        'Limit updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }

    logger.error('Error updating RG limit', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Get current limits
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rgProfile = await prisma.responsibleGamblingProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        dailyDepositLimit: true,
        weeklyDepositLimit: true,
        monthlyDepositLimit: true,
        dailyLossLimit: true,
        weeklyLossLimit: true,
        monthlyLossLimit: true,
        dailyTimeLimit: true,
        sessionTimeLimit: true,
        realityCheckInterval: true,
        status: true,
        coolingOffUntil: true,
        selfExcludedUntil: true,
        jurisdiction: true,
        mandatory: true
      }
    });

    if (!rgProfile) {
      return NextResponse.json({ error: 'RG profile not found' }, { status: 404 });
    }

    return NextResponse.json(rgProfile);

  } catch (error) {
    logger.error('Error fetching RG limits', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
