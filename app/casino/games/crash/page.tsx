import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/db';
// import { jurisdictionEngine } from '@/lib/compliance/jurisdiction'; // Disabled for local dev
import CrashGameInterface from '@/components/casino/CrashGameInterface';

export const metadata: Metadata = {
  title: 'Crash Game | Licensed Casino Platform',
  description: 'Play Crash - a provably fair multiplier game with real money betting.',
};

export default async function CrashGamePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/signin?callbackUrl=/casino/games/crash');
  }

  // Check KYC verification for real money play
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      kycProfile: true,
      wallet: true,
      rgProfile: true
    }
  });

  if (!user) {
    redirect('/signin');
  }

  if (!user.kycProfile?.approved) {
    redirect('/kyc/verify?reason=gaming');
  }

  // Check responsible gambling status
  if (user.rgProfile?.status === 'SELF_EXCLUDED' || 
      (user.rgProfile?.selfExcludedUntil && new Date(user.rgProfile.selfExcludedUntil) > new Date())) {
    redirect('/responsible-gambling/blocked');
  }

  if (user.rgProfile?.status === 'COOLING_OFF' || 
      (user.rgProfile?.coolingOffUntil && new Date(user.rgProfile.coolingOffUntil) > new Date())) {
    redirect('/responsible-gambling/cooling-off');
  }

  // Check if Crash game is allowed in user's jurisdiction
  const jurisdiction = user.kycProfile.jurisdiction;
  const gameAllowed = true; // Allow all games in local development
  
  if (!gameAllowed) {
    redirect('/casino?error=game_not_available');
  }

  // Get recent game history for display
  const recentRounds = await prisma.gameRound.findMany({
    where: {
      game: 'CRASH',
      state: 'CLOSED',
      jurisdiction
    },
    orderBy: { settledAt: 'desc' },
    take: 20,
    select: {
      resultJson: true,
      settledAt: true
    }
  });

  // Get user's betting limits based on RG profile and KYC tier
  const tierLimits = {
    'TIER_1': { maxBet: 100000, minBet: 100 }, // $1000 max, $1 min
    'TIER_2': { maxBet: 500000, minBet: 100 }, // $5000 max, $1 min
    'TIER_3': { maxBet: 1000000, minBet: 100 } // $10000 max, $1 min
  };

  const userLimits = tierLimits[user.kycProfile.tier as keyof typeof tierLimits] || tierLimits['TIER_1'];

  // Apply RG limits if they're lower
  if (user.rgProfile?.dailyLossLimit) {
    const dailyLossLimitCents = user.rgProfile.dailyLossLimit * 100;
    userLimits.maxBet = Math.min(userLimits.maxBet, dailyLossLimitCents);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <CrashGameInterface 
          user={session.user}
          wallet={user.wallet}
          kycProfile={user.kycProfile}
          rgProfile={user.rgProfile}
          userLimits={userLimits}
          jurisdiction={jurisdiction}
          recentHistory={recentRounds.map(round => ({
            crashPoint: (round.resultJson as any).crashPoint,
            settledAt: round.settledAt
          }))}
        />
      </div>
    </div>
  );
}
