import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { serverRNG } from '@/lib/casino/rng';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current server seed hash (pre-committed)
    const serverSeedHash = serverRNG.getCurrentCommit();
    
    // Generate or get client seed
    const clientSeed = request.nextUrl.searchParams.get('clientSeed') || 
                      crypto.randomBytes(16).toString('hex');

    // Get current nonce for user
    const nonce = await getCurrentNonce(session.user.id);

    const provablyFairData = {
      serverSeedHash,
      clientSeed,
      nonce,
      timestamp: Date.now()
    };

    // Log seed generation for audit
    logger.info('Provably fair seed generated', {
      userId: session.user.id,
      serverSeedHash: serverSeedHash.substring(0, 8) + '...',
      clientSeed: clientSeed.substring(0, 8) + '...',
      nonce
    });

    return NextResponse.json(provablyFairData);

  } catch (error) {
    logger.error('Failed to generate provably fair seed', error);
    return NextResponse.json({ 
      error: 'Seed generation failed' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientSeed } = body;

    if (!clientSeed || clientSeed.length < 8) {
      return NextResponse.json({ 
        error: 'Client seed must be at least 8 characters' 
      }, { status: 400 });
    }

    // Update client seed for user
    await updateClientSeed(session.user.id, clientSeed);

    // Get current server seed hash
    const serverSeedHash = serverRNG.getCurrentCommit();
    const nonce = await getCurrentNonce(session.user.id);

    const provablyFairData = {
      serverSeedHash,
      clientSeed,
      nonce,
      timestamp: Date.now()
    };

    logger.info('Client seed updated', {
      userId: session.user.id,
      clientSeed: clientSeed.substring(0, 8) + '...'
    });

    return NextResponse.json(provablyFairData);

  } catch (error) {
    logger.error('Failed to update client seed', error);
    return NextResponse.json({ 
      error: 'Client seed update failed' 
    }, { status: 500 });
  }
}

// Helper functions

async function getCurrentNonce(userId: string): Promise<number> {
  try {
    // Get the latest game round for this user to determine next nonce
    const latestRound = await import('@/lib/db').then(({ prisma }) => 
      prisma.gameRound.findFirst({
        where: {
          bets: {
            some: {
              wallet: {
                userId
              }
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        select: { nonce: true }
      })
    );

    return (latestRound?.nonce || 0) + 1;
  } catch (error) {
    logger.error('Failed to get current nonce', { userId, error });
    return 1; // Default starting nonce
  }
}

async function updateClientSeed(userId: string, clientSeed: string): Promise<void> {
  try {
    // Store client seed in user preferences or separate table
    // For now, we'll use a simple approach with user updates
    const { prisma } = await import('@/lib/db');
    
    // In production, you might want a separate table for provably fair seeds
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Add clientSeed field to User model in production
        // clientSeed: clientSeed
      }
    });
  } catch (error) {
    logger.error('Failed to update client seed', { userId, error });
    throw error;
  }
}
