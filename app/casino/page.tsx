'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Dices, 
  Cherry, 
  TrendingUp, 
  Zap, 
  Crown, 
  Target,
  // Horse, // Not available in this version
  Wallet,
  Gift,
  History,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/use-toast';

interface WalletInfo {
  balance: number;
  formatted: string;
  canClaimBonus: boolean;
}

interface GameResult {
  id: string;
  game: string;
  result: any;
  payout: number;
  timestamp: number;
}

const GAMES = [
  {
    id: 'vegetables',
    name: 'Vegetables',
    nameAr: 'الخضروات',
    description: 'Pick vegetables to reveal multipliers',
    descriptionAr: 'اختر الخضروات لكشف المضاعفات',
    icon: Target,
    color: 'from-green-500 to-emerald-600',
    minBet: '1.00',
    maxPayout: '10x',
  },
  {
    id: 'dice',
    name: 'Dice',
    nameAr: 'النرد',
    description: 'Classic dice betting with multiple options',
    descriptionAr: 'مراهنة النرد الكلاسيكية مع خيارات متعددة',
    icon: Dices,
    color: 'from-red-500 to-pink-600',
    minBet: '1.00',
    maxPayout: '35x',
  },
  {
    id: 'slots',
    name: 'Slots',
    nameAr: 'ماكينات القمار',
    description: '5-reel slots with multiple paylines',
    descriptionAr: 'ماكينات 5 بكرات مع خطوط دفع متعددة',
    icon: Cherry,
    color: 'from-purple-500 to-violet-600',
    minBet: '1.00',
    maxPayout: '50x',
  },
  {
    id: 'crash',
    name: 'Crash',
    nameAr: 'التحطم',
    description: 'Watch the multiplier grow, cash out before crash',
    descriptionAr: 'شاهد المضاعف ينمو، اسحب قبل التحطم',
    icon: TrendingUp,
    color: 'from-orange-500 to-red-600',
    minBet: '1.00',
    maxPayout: '1000x',
  },
  {
    id: 'dragon-tiger',
    name: 'Dragon Tiger',
    nameAr: 'التنين والنمر',
    description: 'Simple card game - highest card wins',
    descriptionAr: 'لعبة ورق بسيطة - البطاقة الأعلى تفوز',
    icon: Zap,
    color: 'from-yellow-500 to-orange-600',
    minBet: '1.00',
    maxPayout: '8x',
  },
  {
    id: 'wheel',
    name: 'Wheel',
    nameAr: 'العجلة',
    description: 'Spin the wheel for instant wins',
    descriptionAr: 'أدر العجلة للفوز الفوري',
    icon: Target,
    color: 'from-blue-500 to-cyan-600',
    minBet: '1.00',
    maxPayout: '50x',
  },
  {
    id: 'horse-racing',
    name: 'Horse Racing',
    nameAr: 'سباق الخيل',
    description: 'Bet on your favorite horse to win',
    descriptionAr: 'راهن على حصانك المفضل للفوز',
    icon: Target,
    color: 'from-emerald-500 to-teal-600',
    minBet: '1.00',
    maxPayout: '10x',
  },
];

export default function CasinoLobby() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [recentResults, setRecentResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWalletInfo();
    fetchRecentResults();
  }, []);

  const fetchWalletInfo = async () => {
    try {
      const response = await fetch('/api/casino/wallet');
      if (response.ok) {
        const data = await response.json();
        setWalletInfo({
          balance: data.wallet.balance,
          formatted: data.wallet.formatted,
          canClaimBonus: data.bonus.available,
        });
      }
    } catch (error) {
      console.error('Failed to fetch wallet info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentResults = async () => {
    try {
      // Would fetch recent game results here
      setRecentResults([]);
    } catch (error) {
      console.error('Failed to fetch recent results:', error);
    }
  };

  const handleClaimBonus = async () => {
    try {
      const response = await fetch('/api/casino/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({ action: 'claim_daily_bonus' }),
      });

      if (response.ok) {
        const data = await response.json();
        setWalletInfo(prev => prev ? {
          ...prev,
          balance: data.wallet.balance,
          formatted: data.wallet.formatted,
          canClaimBonus: false,
        } : null);
        
        toast({
          title: 'Bonus Claimed!',
          description: `You received ${data.bonus.formatted} demo credits.`,
        });
      } else {
        throw new Error('Failed to claim bonus');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to claim daily bonus. Please try again.',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="spinner mb-4"></div>
          <p>Loading casino...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Wallet Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Demo Wallet
            </CardTitle>
            <CardDescription className="text-white/80">
              Your current demo credits balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {walletInfo ? walletInfo.formatted : 'Loading...'}
                </div>
                <div className="text-white/60 text-sm">Demo Credits (No Real Value)</div>
              </div>
              
              {walletInfo?.canClaimBonus && (
                <Button onClick={handleClaimBonus} variant="secondary">
                  <Gift className="h-4 w-4 mr-2" />
                  Claim Daily Bonus
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/80">Games Available:</span>
                <span className="font-medium">{GAMES.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Min Bet:</span>
                <span className="font-medium">1.00 Credits</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Max Bet:</span>
                <span className="font-medium">100.00 Credits</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Casino Games</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {GAMES.map((game) => (
            <Link key={game.id} href={`/casino/games/${game.id}`}>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer group">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${game.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <game.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white">{game.name}</CardTitle>
                  <CardDescription className="text-white/80 text-sm">
                    {game.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Min: {game.minBet}</span>
                    <span>Max: {game.maxPayout}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-white/80">
            Latest game results from all players
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentResults.length > 0 ? (
            <div className="space-y-3">
              {recentResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium">{result.game}</div>
                    <div className="text-xs text-white/60">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${result.payout > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.payout > 0 ? '+' : ''}{result.payout / 100} Credits
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity. Start playing to see results here!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="bg-yellow-500/20 border-yellow-500/30 text-yellow-100">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Important Notice</p>
              <p>
                This is a demonstration casino using virtual demo credits only. 
                No real money is involved. All games use provably fair algorithms 
                for transparency. Play responsibly and set limits for yourself.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
