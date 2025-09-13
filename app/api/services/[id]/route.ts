import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyCSRF } from '@/lib/csrf';
import { createRequestLogger } from '@/lib/logger';
import { generateSlug } from '@/lib/utils';

const serviceUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().optional(),
  description: z.string().min(1).max(1000).optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive().optional(),
  image: z.string().optional(),
  active: z.boolean().optional(),
  slug: z.string().optional(),
});

interface RouteParams {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const logger = createRequestLogger(request);

  try {
    const session = await getServerSession(authOptions);
    const serviceId = params.id;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if user can view inactive services
    if (!service.active && !session) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    logger.info('Service fetched', { 
      serviceId: service.id,
      userId: session?.user.id,
    });

    return NextResponse.json(service);

  } catch (error) {
    logger.error('Failed to fetch service', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const logger = createRequestLogger(request);

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role permissions
    if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify CSRF token
    if (!verifyCSRF(request)) {
      logger.warn('Service update CSRF verification failed', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const serviceId = params.id;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = serviceUpdateSchema.parse(body);

    // Generate slug if name changed and slug not provided
    if (validatedData.name && !validatedData.slug && validatedData.name !== existingService.name) {
      const existingSlugs = await prisma.service.findMany({
        where: { id: { not: serviceId } },
        select: { slug: true },
      });
      validatedData.slug = generateSlug(
        validatedData.name,
        existingSlugs.map(s => s.slug)
      );
    }

    // Convert price to proper format
    const updateData = {
      ...validatedData,
      price: validatedData.price !== undefined ? validatedData.price : undefined,
    };

    logger.info('Updating service', {
      userId: session.user.id,
      serviceId,
      changes: Object.keys(validatedData),
    });

    // Update the service
    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
    });

    logger.info('Service updated successfully', { serviceId });

    return NextResponse.json(updatedService);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Service update validation failed', { errors: error.errors });
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Service update failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const logger = createRequestLogger(request);

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role permissions (only ADMIN can delete services)
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify CSRF token
    if (!verifyCSRF(request)) {
      logger.warn('Service delete CSRF verification failed', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const serviceId = params.id;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    logger.info('Deleting service', {
      userId: session.user.id,
      serviceId,
      serviceName: existingService.name,
    });

    // Delete the service
    await prisma.service.delete({
      where: { id: serviceId },
    });

    logger.info('Service deleted successfully', { serviceId });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Service deletion failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
