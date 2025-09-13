'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Dices, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/lib/use-toast';

interface DiceResult {
  dice1: number;
  dice2: number;
  sum: number;
  won: boolean;
  payout: number;
  multiplier: number;
}

interface WalletInfo {
  balance: number;
  formatted: string;
}

export default function DiceGame() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [betAmount, setBetAmount] = useState('500'); // 5.00 credits
  const [betType, setBetType] = useState<string>('');
  const [exactSum, setExactSum] = useState('7');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<DiceResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWalletInfo();
  }, []);

  const fetchWalletInfo = async () => {
    try {
      const response = await fetch('/api/casino/wallet');
      if (response.ok) {
        const data = await response.json();
        setWallet({
          balance: data.wallet.balance,
          formatted: data.wallet.formatted,
        });
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  };

  const placeBet = async () => {
    if (!betType) {
      toast({
        variant: 'destructive',
        title: 'Invalid Selection',
        description: 'Please select a bet type.',
      });
      return;
    }

    setLoading(true);
    setIsPlaying(true);

    try {
      // Create selection object
      const selection: any = { betType };
      if (betType === 'exact_sum') {
        selection.value = parseInt(exactSum);
      }

      // Place bet
      const betResponse = await fetch('/api/casino/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({
          game: 'DICE',
          stake: parseInt(betAmount),
          selection,
        }),
      });

      if (!betResponse.ok) {
        const errorData = await betResponse.json();
        throw new Error(errorData.error || 'Bet failed');
      }

      const betData = await betResponse.json();
      const { roundId } = betData;

      // Settle the round
      const settleResponse = await fetch('/api/casino/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({ roundId }),
      });

      if (!settleResponse.ok) {
        throw new Error('Settlement failed');
      }

      const settleData = await settleResponse.json();
      const result = settleData.round.result;

      setLastResult({
        dice1: result.dice1,
        dice2: result.dice2,
        sum: result.sum,
        won: result.won,
        payout: result.payout,
        multiplier: result.multiplier,
      });

      // Update wallet
      await fetchWalletInfo();

      if (result.won) {
        toast({
          title: 'You Won!',
          description: `You won ${(result.payout / 100).toFixed(2)} demo credits!`,
        });
      } else {
        toast({
          title: 'Better luck next time!',
          description: 'Your bet didn\'t win this round.',
        });
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: String(error) || 'Failed to place bet',
      });
    } finally {
      setLoading(false);
      setTimeout(() => setIsPlaying(false), 1000);
    }
  };

  const betOptions = [
    { value: 'hi_7', label: 'Over 7', description: 'Sum > 7' },
    { value: 'lo_7', label: 'Under 7', description: 'Sum < 7' },
    { value: 'exact_7', label: 'Exactly 7', description: 'Sum = 7' },
    { value: 'doubles', label: 'Doubles', description: 'Both dice same' },
    { value: 'exact_sum', label: 'Exact Sum', description: 'Specific sum' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/casino">
            <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Dices className="h-8 w-8 mr-3" />
              Dice Game
            </h1>
            <p className="text-white/80">Roll two dice and bet on the outcome</p>
          </div>
        </div>

        {wallet && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{wallet.formatted}</div>
            <div className="text-white/60 text-sm">Demo Credits</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Place Your Bet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dice Display */}
            <div className="flex justify-center space-x-8 py-8">
              <div className={`w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold transition-transform ${isPlaying ? 'animate-bounce' : ''}`}>
                {lastResult ? lastResult.dice1 : '?'}
              </div>
              <div className={`w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl font-bold transition-transform ${isPlaying ? 'animate-bounce' : ''}`}>
                {lastResult ? lastResult.dice2 : '?'}
              </div>
            </div>

            {lastResult && (
              <div className="text-center text-white">
                <div className="text-lg font-medium mb-2">
                  Sum: {lastResult.sum}
                </div>
                <div className={`text-2xl font-bold ${lastResult.won ? 'text-green-400' : 'text-red-400'}`}>
                  {lastResult.won ? 'WIN!' : 'LOSE'}
                </div>
                {lastResult.won && (
                  <div className="text-white/80">
                    Payout: {(lastResult.payout / 100).toFixed(2)} Credits
                  </div>
                )}
              </div>
            )}

            {/* Betting Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="bet-amount" className="text-white">
                  Bet Amount (Credits)
                </Label>
                <Input
                  id="bet-amount"
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={(parseInt(betAmount) / 100).toFixed(2)}
                  onChange={(e) => setBetAmount((parseFloat(e.target.value) * 100).toString())}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bet-type" className="text-white">
                  Bet Type
                </Label>
                <Select value={betType} onValueChange={setBetType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select bet type" />
                  </SelectTrigger>
                  <SelectContent>
                    {betOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {betType === 'exact_sum' && (
                <div>
                  <Label htmlFor="exact-sum" className="text-white">
                    Exact Sum
                  </Label>
                  <Select value={exactSum} onValueChange={setExactSum}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => i + 2).map((sum) => (
                        <SelectItem key={sum} value={sum.toString()}>
                          {sum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={placeBet}
                disabled={loading || !betType || !wallet}
                className="w-full"
                size="lg"
              >
                {loading ? 'Rolling...' : 'Roll Dice'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Game Rules */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">How to Play</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-sm space-y-3">
              <p><strong>Over 7:</strong> Win if sum &gt; 7 (1:1 payout)</p>
              <p><strong>Under 7:</strong> Win if sum &lt; 7 (1:1 payout)</p>
              <p><strong>Exactly 7:</strong> Win if sum = 7 (5:1 payout)</p>
              <p><strong>Doubles:</strong> Both dice same (5:1 payout)</p>
              <p><strong>Exact Sum:</strong> Pick specific sum (2-35:1 payout)</p>
            </CardContent>
          </Card>

          {/* Payout Table */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Over/Under 7:</span>
                  <span className="text-green-400">1:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Exactly 7:</span>
                  <span className="text-green-400">5:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Doubles:</span>
                  <span className="text-green-400">5:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Sum 2 or 12:</span>
                  <span className="text-green-400">35:1</span>
                </div>
                <div className="flex justify-between">
                  <span>Sum 3 or 11:</span>
                  <span className="text-green-400">17:1</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Recent Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-white/60 py-6">
                <Dices className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Play to see recent results</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
