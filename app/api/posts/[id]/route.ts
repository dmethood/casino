import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyCSRF } from '@/lib/csrf';
import { createRequestLogger } from '@/lib/logger';
import { generateSlug } from '@/lib/utils';

const postUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  titleAr: z.string().optional(),
  excerpt: z.string().min(1).max(500).optional(),
  excerptAr: z.string().optional(),
  content: z.string().min(1).optional(),
  contentAr: z.string().optional(),
  coverImage: z.string().optional(),
  published: z.boolean().optional(),
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
    const postId = params.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
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

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user can view unpublished posts
    if (!post.published && !session) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    logger.info('Post fetched', { 
      postId: post.id,
      userId: session?.user.id,
    });

    return NextResponse.json(post);

  } catch (error) {
    logger.error('Failed to fetch post', error);
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
      logger.warn('Post update CSRF verification failed', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const postId = params.id;

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = postUpdateSchema.parse(body);

    // Generate slug if title changed and slug not provided
    if (validatedData.title && !validatedData.slug && validatedData.title !== existingPost.title) {
      const existingSlugs = await prisma.post.findMany({
        where: { id: { not: postId } },
        select: { slug: true },
      });
      validatedData.slug = generateSlug(
        validatedData.title,
        existingSlugs.map(p => p.slug)
      );
    }

    logger.info('Updating post', {
      userId: session.user.id,
      postId,
      changes: Object.keys(validatedData),
    });

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: validatedData,
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

    logger.info('Post updated successfully', { postId });

    return NextResponse.json(updatedPost);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Post update validation failed', { errors: error.errors });
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Post update failed', error);
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

    // Check role permissions (only ADMIN can delete posts)
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify CSRF token
    if (!verifyCSRF(request)) {
      logger.warn('Post delete CSRF verification failed', { userId: session.user.id });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const postId = params.id;

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    logger.info('Deleting post', {
      userId: session.user.id,
      postId,
      postTitle: existingPost.title,
    });

    // Delete the post
    await prisma.post.delete({
      where: { id: postId },
    });

    logger.info('Post deleted successfully', { postId });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Post deletion failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
