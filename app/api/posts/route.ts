import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiRateLimit } from '@/lib/ratelimit';
import { verifyCSRF } from '@/lib/csrf';
import { createRequestLogger } from '@/lib/logger';
import { generateSlug } from '@/lib/utils';

const postSchema = z.object({
  title: z.string().min(1).max(200),
  titleAr: z.string().optional(),
  excerpt: z.string().min(1).max(500),
  excerptAr: z.string().optional(),
  content: z.string().min(1),
  contentAr: z.string().optional(),
  coverImage: z.string().optional(),
  published: z.boolean().default(false),
  slug: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Check authentication for non-public requests
    const session = await getServerSession(authOptions);
    const searchParams = new URL(request.url).searchParams;
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';

    // Only authenticated users can see unpublished posts
    if (includeUnpublished && !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const skip = (page - 1) * limit;

    const whereClause = includeUnpublished 
      ? {}
      : { published: true };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
               firstName: true,
               lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where: whereClause }),
    ]);

    logger.info('Posts fetched', { 
      count: posts.length, 
      total,
      includeUnpublished,
      userId: session?.user.id,
    });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    logger.error('Failed to fetch posts', error);
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
      logger.warn('Posts API CSRF verification failed', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = postSchema.parse(body);

    // Generate slug if not provided
    if (!validatedData.slug) {
      const existingSlugs = await prisma.post.findMany({
        select: { slug: true },
      });
      validatedData.slug = generateSlug(
        validatedData.title, 
        existingSlugs.map(p => p.slug)
      );
    }

    logger.info('Creating new post', {
      userId: session.user.id,
      title: validatedData.title,
      slug: validatedData.slug,
    });

    // Create the post
    const post = await prisma.post.create({
      data: {
        ...validatedData,
        slug: validatedData.slug || `post-${Date.now()}`,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
               firstName: true,
               lastName: true,
          },
        },
      },
    });

    logger.info('Post created successfully', { postId: post.id });

    return NextResponse.json(post, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Post creation validation failed', { errors: error.errors });
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Post creation failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
