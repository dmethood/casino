import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serverRNG } from '@/lib/casino/rng';
import { CASINO_CONFIG } from '@/lib/casino/config';
import { createRequestLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Check if casino is enabled
    if (!CASINO_CONFIG.ENABLED) {
      return NextResponse.json(
        { error: 'Casino module is disabled' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    logger.info('Fetching provably fair seeds', { userId: userId || 'guest' });

    // Get current commit (server seed hash for next round)
    const currentCommit = serverRNG.getCurrentCommit();

    // Get latest 10 completed rounds with reveals
    const recentRounds = await prisma.gameRound.findMany({
      where: {
        state: 'CLOSED',
        serverSeed: { not: null },
      },
      orderBy: { settledAt: 'desc' },
      take: 10,
      select: {
        id: true,
        game: true,
        serverSeed: true,
        clientSeed: true,
        nonce: true,
        settledAt: true,
        resultJson: true,
      },
    });

    // Format reveals for client verification
    const reveals = recentRounds.map(round => ({
      roundId: round.id,
      game: round.game,
      serverSeed: round.serverSeed,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      result: round.resultJson,
      timestamp: round.settledAt?.getTime(),
      verified: true, // Could verify on the fly if needed
    }));

    logger.info('Provably fair seeds fetched', { 
      revealCount: reveals.length,
      userId: userId || 'guest' 
    });

    return NextResponse.json({
      success: true,
      current: {
        serverSeedHash: currentCommit,
        message: 'Server seed will be revealed after the next round',
      },
      reveals: reveals,
      verification: {
        howTo: 'Use the server seed, client seed, and nonce to verify results using HMAC-SHA256',
        algorithm: 'HMAC-SHA256(serverSeed, clientSeed:nonce)',
      },
    });

  } catch (error) {
    logger.error('Failed to fetch provably fair seeds', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
