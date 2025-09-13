import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiRateLimit } from '@/lib/ratelimit';
import { verifyCSRF } from '@/lib/csrf';
import { createRequestLogger } from '@/lib/logger';
import { generateSlug } from '@/lib/utils';

const serviceSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().optional(),
  description: z.string().min(1).max(1000),
  descriptionAr: z.string().optional(),
  price: z.number().positive().optional(),
  image: z.string().optional(),
  active: z.boolean().default(true),
  slug: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    const session = await getServerSession(authOptions);
    const searchParams = new URL(request.url).searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Only authenticated users can see inactive services
    if (includeInactive && !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const skip = (page - 1) * limit;

    const whereClause = includeInactive 
      ? {}
      : { active: true };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.service.count({ where: whereClause }),
    ]);

    logger.info('Services fetched', { 
      count: services.length, 
      total,
      includeInactive,
      userId: session?.user.id,
    });

    return NextResponse.json({
      services,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    logger.error('Failed to fetch services', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Apply rate limiting
    const rateLimitResult = apiRateLimit(request);
    if (!rateLimitResult.success) {
      logger.warn('API rate limit exceeded', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Verify CSRF token
    if (!verifyCSRF(request)) {
      logger.warn('Services API CSRF verification failed', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = serviceSchema.parse(body);

    // Generate slug if not provided
    if (!validatedData.slug) {
      const existingSlugs = await prisma.service.findMany({
        select: { slug: true },
      });
      validatedData.slug = generateSlug(
        validatedData.name, 
        existingSlugs.map(s => s.slug)
      );
    }

    // Convert price to Decimal if provided
    const serviceData = {
      ...validatedData,
      price: validatedData.price ? validatedData.price : null,
    };

    logger.info('Creating new service', {
      userId: session.user.id,
      name: validatedData.name,
      slug: validatedData.slug,
    });

    // Create the service
    const service = await prisma.service.create({
      data: {
        ...serviceData,
        slug: serviceData.slug || `service-${Date.now()}`
      },
    });

    logger.info('Service created successfully', { serviceId: service.id });

    return NextResponse.json(service, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Service creation validation failed', { errors: error.errors });
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Service creation failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
