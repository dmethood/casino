import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default async function CasinoDashboard() {
  // Check if casino is enabled
  const casinoEnabled = process.env.CASINO_ENABLED === 'true';

  if (!casinoEnabled) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <XCircle className="h-8 w-8 text-gray-400" />
              </div>
              <CardTitle>Casino Module Disabled</CardTitle>
              <CardDescription>
                The casino module is currently disabled. Set CASINO_ENABLED=true in your environment to enable it.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                The casino module provides demo gaming functionality with virtual credits only. 
                No real money is involved.
              </p>
              <Button variant="outline" disabled>
                Enable Casino Module
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Contact your system administrator to enable this feature.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch casino statistics
  const [
    totalWallets,
    totalRounds,
    totalBets,
    activeRounds,
    recentRounds,
    totalStaked,
    totalPayout,
  ] = await Promise.all([
    prisma.wallet.count(),
    prisma.gameRound.count(),
    prisma.bet.count(),
    prisma.gameRound.count({ where: { state: 'OPEN' } }),
    prisma.gameRound.findMany({
      take: 10,
      orderBy: { settledAt: 'desc' },
      where: { state: 'CLOSED' },
      include: {
        bets: true,
      },
    }),
    prisma.walletTransaction.aggregate({
      where: { reason: 'BET_STAKE' },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { reason: 'BET_PAYOUT' },
      _sum: { amount: true },
    }),
  ]);

  const totalStakedAmount = Math.abs((totalStaked._sum.amount as any) || 0);
  const totalPayoutAmount = (totalPayout._sum.amount as any) || 0;
  const houseEdge = totalStakedAmount > 0 ? ((totalStakedAmount - totalPayoutAmount) / totalStakedAmount) * 100 : 0;
  const rtp = totalStakedAmount > 0 ? (totalPayoutAmount / totalStakedAmount) * 100 : 0;

  const stats = [
    {
      name: 'Total Wallets',
      value: totalWallets,
      description: 'Demo wallets created',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      name: 'Game Rounds',
      value: totalRounds,
      description: `${activeRounds} currently active`,
      icon: Activity,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      name: 'Total Bets',
      value: totalBets,
      description: 'All-time demo bets',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      name: 'House Edge',
      value: `${houseEdge.toFixed(2)}%`,
      description: `RTP: ${rtp.toFixed(2)}%`,
      icon: DollarSign,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  const gameTypes = ['VEGETABLES', 'DICE', 'SLOTS', 'CRASH', 'DRAGON_TIGER', 'WHEEL', 'HORSE_RACING'];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Casino Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor and manage the demo casino module.
          </p>
          <div className="mt-4 flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Demo Credits Only
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              No Real Money
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common casino management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="justify-start" disabled>
                <Activity className="h-4 w-4 mr-2" />
                View Live Games
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <TrendingUp className="h-4 w-4 mr-2" />
                RTP Analysis
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Users className="h-4 w-4 mr-2" />
                Player Management
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <DollarSign className="h-4 w-4 mr-2" />
                Credit Management
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Casino management features are available in the full version.
            </p>
          </CardContent>
        </Card>

        {/* Recent Game Rounds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Game Rounds
            </CardTitle>
            <CardDescription>
              Latest completed game rounds across all games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRounds.length > 0 ? (
              <div className="space-y-4">
                {recentRounds.map((round) => (
                  <div key={round.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">
                        {round.game}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">Round {round.id.slice(0, 8)}</div>
                        <div className="text-xs text-gray-500">
                          {round.bets.length} bet{round.bets.length !== 1 ? 's' : ''} • 
                          {round.settledAt ? formatDate(round.settledAt) : 'In progress'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {round.bets.reduce((sum: number, bet: any) => sum + (bet.payout || 0), 0) / 100} Credits
                      </div>
                      <div className="text-xs text-gray-500">
                        Total Payout
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No game rounds yet</p>
                <p className="text-sm">Rounds will appear here once players start gaming</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Game Status</CardTitle>
            <CardDescription>
              Current status of all casino games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {gameTypes.map((gameType) => (
                <div key={gameType} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{gameType.replace('_', ' ')}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    Demo mode • 96% RTP
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
