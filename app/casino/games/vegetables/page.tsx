'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/use-toast';
import { cn } from '@/lib/utils';

interface VegetablesResult {
  grid: number[];
  picks: number[];
  totalMultiplier: number;
  won: boolean;
  payout: number;
}

interface WalletInfo {
  balance: number;
  formatted: string;
}

export default function VegetablesGame() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [betAmount, setBetAmount] = useState('1000'); // 10.00 credits
  const [selectedPicks, setSelectedPicks] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<VegetablesResult | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const { toast } = useToast();

  const maxPicks = 3;
  const gridSize = 9; // 3x3 grid

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

  const togglePick = (index: number) => {
    if (selectedPicks.includes(index)) {
      setSelectedPicks(selectedPicks.filter(pick => pick !== index));
    } else if (selectedPicks.length < maxPicks) {
      setSelectedPicks([...selectedPicks, index]);
    }
  };

  const placeBet = async () => {
    if (selectedPicks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Selection',
        description: 'Please select at least one vegetable crate.',
      });
      return;
    }

    setLoading(true);
    setShowGrid(true);

    try {
      // Place bet
      const betResponse = await fetch('/api/casino/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({
          game: 'VEGETABLES',
          stake: parseInt(betAmount),
          selection: { picks: selectedPicks },
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
        grid: result.grid,
        picks: result.picks,
        totalMultiplier: result.totalMultiplier,
        won: result.won,
        payout: result.payout,
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
          title: 'No luck this time!',
          description: 'Better luck on your next pick!',
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
    }
  };

  const resetGame = () => {
    setSelectedPicks([]);
    setLastResult(null);
    setShowGrid(false);
  };

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
              <Target className="h-8 w-8 mr-3" />
              Vegetables
            </h1>
            <p className="text-white/80">Pick vegetable crates to reveal multipliers</p>
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
            <CardTitle className="text-white">Vegetable Crates</CardTitle>
            <div className="text-white/80 text-sm">
              Pick up to {maxPicks} crates to reveal multipliers
            </div>
          </CardHeader>
          <CardContent>
            {/* Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {Array.from({ length: gridSize }, (_, index) => {
                const isSelected = selectedPicks.includes(index);
                const isPicked = lastResult?.picks.includes(index);
                const multiplier = lastResult?.grid[index];
                const showMultiplier = showGrid && isPicked;

                return (
                  <button
                    key={index}
                    onClick={() => !showGrid && togglePick(index)}
                    disabled={loading || showGrid}
                    className={cn(
                      'aspect-square rounded-lg border-2 transition-all duration-300 flex items-center justify-center text-lg font-bold',
                      'hover:scale-105 active:scale-95',
                      isSelected && !showGrid && 'border-yellow-400 bg-yellow-400/20',
                      !isSelected && !showGrid && 'border-white/30 bg-white/10 hover:bg-white/20',
                      showGrid && isPicked && multiplier === 0 && 'border-red-500 bg-red-500/20 text-red-300',
                      showGrid && isPicked && (multiplier ?? 0) > 0 && 'border-green-500 bg-green-500/20 text-green-300',
                      showGrid && !isPicked && 'border-gray-500 bg-gray-500/20 text-gray-400'
                    )}
                  >
                    {showMultiplier ? (
                      multiplier === 0 ? '💣' : `${multiplier}x`
                    ) : (
                      '🥕'
                    )}
                  </button>
                );
              })}
            </div>

            {/* Result Display */}
            {lastResult && (
              <div className="text-center text-white mb-6">
                <div className="text-lg font-medium mb-2">
                  Total Multiplier: {lastResult.totalMultiplier}x
                </div>
                <div className={`text-2xl font-bold ${lastResult.won ? 'text-green-400' : 'text-red-400'}`}>
                  {lastResult.won ? 'WIN!' : 'NO WIN'}
                </div>
                {lastResult.won && (
                  <div className="text-white/80">
                    Payout: {(lastResult.payout / 100).toFixed(2)} Credits
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="space-y-4">
              <div>
                <Label className="text-white">Bet Amount (Credits)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={(parseInt(betAmount) / 100).toFixed(2)}
                  onChange={(e) => setBetAmount((parseFloat(e.target.value) * 100).toString())}
                  className="mt-1"
                />
              </div>

              <div className="text-white/80 text-sm">
                Selected: {selectedPicks.length} / {maxPicks}
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={placeBet}
                  disabled={loading || selectedPicks.length === 0 || !wallet}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? 'Revealing...' : 'Reveal Crates'}
                </Button>
                
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  New Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Game Rules */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Game Rules</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-sm space-y-3">
              <p>1. Select up to {maxPicks} vegetable crates</p>
              <p>2. Each crate contains a hidden multiplier</p>
              <p>3. Some crates contain bombs (0x)</p>
              <p>4. Your total multiplier is the sum of all revealed values</p>
              <p>5. Demo credits only - no real money involved</p>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>RTP:</span>
                  <span className="text-green-400">96%</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Multiplier:</span>
                  <span className="text-yellow-400">30x</span>
                </div>
                <div className="flex justify-between">
                  <span>Min Bet:</span>
                  <span>1.00 Credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Bet:</span>
                  <span>100.00 Credits</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
