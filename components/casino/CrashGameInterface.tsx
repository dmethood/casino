'use client';

import { useState, useEffect, useRef } from 'react';
import { AuthUser } from '@/lib/auth';
import { 
  ArrowLeft, 
  TrendingUp, 
  Zap, 
  DollarSign,
  Shield,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/use-toast';

interface CrashGameInterfaceProps {
  user: AuthUser;
  wallet: any;
  kycProfile: any;
  rgProfile: any;
  userLimits: {
    maxBet: number;
    minBet: number;
  };
  jurisdiction: string;
  recentHistory: Array<{
    crashPoint: number;
    settledAt: Date | null;
  }>;
}

interface ProvablyFairData {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  revealed?: {
    serverSeed: string;
    result: number;
    verified: boolean;
  };
}

interface CrashResult {
  crashPoint: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  won: boolean;
  payout: number;
  netResult: number;
  provablyFair: ProvablyFairData;
}

export default function CrashGameInterface({ 
  user, 
  wallet, 
  kycProfile, 
  rgProfile, 
  userLimits, 
  jurisdiction, 
  recentHistory 
}: CrashGameInterfaceProps) {
  const [betAmount, setBetAmount] = useState((userLimits.minBet / 100).toString()); // Convert cents to dollars
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CrashResult | null>(null);
  const [gameHistory, setGameHistory] = useState(recentHistory.map(h => h.crashPoint));
  const [currentBalance, setCurrentBalance] = useState(wallet?.balance || 0);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [currentProvablyFair, setCurrentProvablyFair] = useState<ProvablyFairData | null>(null);
  const [sessionStats, setSessionStats] = useState({
    totalWagered: 0,
    totalWon: 0,
    gamesPlayed: 0,
    biggestWin: 0
  });

  const { toast } = useToast();
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    fetchCurrentSeed();
    startSessionTracking();
  }, []);

  useEffect(() => {
    // Check RG limits during session
    checkSessionLimits();
  }, [sessionStats]);

  const fetchCurrentSeed = async () => {
    try {
      const response = await fetch('/api/casino/provably-fair/seed');
      if (response.ok) {
        const data = await response.json();
        setCurrentProvablyFair(data);
      }
    } catch (error) {
      console.error('Failed to fetch seed:', error);
    }
  };

  const startSessionTracking = async () => {
    try {
      await fetch('/api/casino/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          game: 'CRASH'
        })
      });
    } catch (error) {
      console.error('Failed to start session tracking:', error);
    }
  };

  const checkSessionLimits = () => {
    // Check daily time limit
    if (rgProfile?.dailyTimeLimit) {
      const sessionDuration = (Date.now() - sessionStartTime.current) / 60000; // minutes
      if (sessionDuration >= rgProfile.dailyTimeLimit) {
        toast({
          variant: 'destructive',
          title: 'Daily Time Limit Reached',
          description: 'You have reached your daily gambling time limit.',
        });
        setTimeout(() => {
          window.location.href = '/responsible-gambling/tools';
        }, 3000);
        return;
      }
    }

    // Check session time limit
    if (rgProfile?.sessionTimeLimit) {
      const sessionDuration = (Date.now() - sessionStartTime.current) / 60000; // minutes
      if (sessionDuration >= rgProfile.sessionTimeLimit) {
        toast({
          variant: 'destructive',
          title: 'Session Time Limit Reached',
          description: 'You have reached your session time limit.',
        });
        setTimeout(() => {
          window.location.href = '/responsible-gambling/tools';
        }, 3000);
        return;
      }
    }

    // Check loss limits
    if (rgProfile?.dailyLossLimit) {
      const dailyLoss = sessionStats.totalWagered - sessionStats.totalWon;
      const dailyLossLimit = rgProfile.dailyLossLimit * 100; // Convert to cents
      
      if (dailyLoss >= dailyLossLimit) {
        toast({
          variant: 'destructive',
          title: 'Daily Loss Limit Reached',
          description: 'You have reached your daily loss limit.',
        });
        setTimeout(() => {
          window.location.href = '/responsible-gambling/tools';
        }, 3000);
        return;
      }
    }
  };

  const placeBet = async () => {
    const betAmountCents = Math.floor(parseFloat(betAmount) * 100);
    const cashoutValue = parseFloat(autoCashout);

    // Validation
    if (betAmountCents < userLimits.minBet) {
      toast({
        variant: 'destructive',
        title: 'Bet Too Small',
        description: `Minimum bet is $${(userLimits.minBet / 100).toFixed(2)}`,
      });
      return;
    }

    if (betAmountCents > userLimits.maxBet) {
      toast({
        variant: 'destructive',
        title: 'Bet Too Large',
        description: `Maximum bet is $${(userLimits.maxBet / 100).toFixed(2)}`,
      });
      return;
    }

    if (betAmountCents > currentBalance * 100) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: 'Please deposit more funds to place this bet.',
      });
      return;
    }

    if (cashoutValue < 1.01) {
      toast({
        variant: 'destructive',
        title: 'Invalid Cashout',
        description: 'Auto cashout must be at least 1.01x',
      });
      return;
    }

    setLoading(true);

    try {
      // Place bet with provably fair
      const betResponse = await fetch('/api/casino/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game: 'CRASH',
          stake: betAmountCents,
          selection: { 
            autoCashout: cashoutValue 
          },
          provablyFair: {
            clientSeed: currentProvablyFair?.clientSeed || `${Date.now()}_${Math.random()}`,
            nonce: currentProvablyFair?.nonce || 0
          }
        }),
      });

      if (!betResponse.ok) {
        const errorData = await betResponse.json();
        throw new Error(errorData.error || 'Bet placement failed');
      }

      const betData = await betResponse.json();
      const { roundId, provablyFair } = betData;

      // Settle the round immediately for crash game
      const settleResponse = await fetch('/api/casino/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roundId }),
      });

      if (!settleResponse.ok) {
        throw new Error('Game settlement failed');
      }

      const settleData = await settleResponse.json();
      const result = settleData.round.result;

      const crashResult: CrashResult = {
        crashPoint: result.crashPoint,
        cashedOut: result.cashedOut,
        cashoutMultiplier: result.cashoutMultiplier,
        won: result.won,
        payout: result.payout,
        netResult: result.won ? result.payout - betAmountCents : -betAmountCents,
        provablyFair: {
          serverSeedHash: provablyFair.serverSeedHash,
          clientSeed: provablyFair.clientSeed,
          nonce: provablyFair.nonce,
          revealed: {
            serverSeed: provablyFair.serverSeed,
            result: result.crashPoint,
            verified: settleData.verified
          }
        }
      };

      setLastResult(crashResult);

      // Update game history
      setGameHistory(prev => [result.crashPoint, ...prev.slice(0, 19)]);

      // Update wallet balance
      setCurrentBalance(settleData.wallet.balance);

      // Update session stats
      setSessionStats(prev => ({
        totalWagered: prev.totalWagered + betAmountCents,
        totalWon: prev.totalWon + (result.won ? result.payout : 0),
        gamesPlayed: prev.gamesPlayed + 1,
        biggestWin: Math.max(prev.biggestWin, result.won ? result.payout : 0)
      }));

      // Get new seed for next round
      await fetchCurrentSeed();

      // Show result
      if (result.won) {
        toast({
          title: '🎉 Successful Cashout!',
          description: `Cashed out at ${result.cashoutMultiplier}x! Won $${(result.payout / 100).toFixed(2)}`,
        });
      } else {
        toast({
          title: '💥 Rocket Crashed!',
          description: `Crashed at ${result.crashPoint}x before your ${cashoutValue}x target`,
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier < 2) return 'text-red-400';
    if (multiplier < 10) return 'text-yellow-400';
    return 'text-green-400';
  };

  const copyProvablyFairData = () => {
    if (!lastResult?.provablyFair) return;

    const data = JSON.stringify({
      serverSeed: lastResult.provablyFair.revealed?.serverSeed,
      clientSeed: lastResult.provablyFair.clientSeed,
      nonce: lastResult.provablyFair.nonce,
      result: lastResult.crashPoint
    }, null, 2);

    navigator.clipboard.writeText(data);
    toast({
      title: 'Copied to Clipboard',
      description: 'Provably fair data copied for verification',
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Balance and RG Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/casino">
            <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Casino
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <TrendingUp className="h-8 w-8 mr-3 text-yellow-400" />
              Crash Game
            </h1>
            <p className="text-white/80">Real money • Provably fair • Licensed in {jurisdiction}</p>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-2xl font-bold text-white">
            {formatCurrency(currentBalance * 100)}
          </div>
          <div className="text-white/60 text-sm">Available Balance</div>
          <div className="text-xs text-white/50">
            Tier {kycProfile.tier} • Max bet: {formatCurrency(userLimits.maxBet)}
          </div>
        </div>
      </div>

      {/* RG Alerts */}
      {rgProfile && (rgProfile.dailyLossLimit || rgProfile.sessionTimeLimit) && (
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center text-amber-300">
            <Shield className="h-5 w-5 mr-2" />
            <div className="text-sm">
              <strong>Responsible Gambling:</strong>
              {rgProfile.dailyLossLimit && (
                <span className="ml-2">Daily loss limit: {formatCurrency(rgProfile.dailyLossLimit * 100)}</span>
              )}
              {rgProfile.sessionTimeLimit && (
                <span className="ml-2">Session limit: {rgProfile.sessionTimeLimit} minutes</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Game Area */}
        <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-xl">🚀 Crash Multiplier</CardTitle>
                <CardDescription className="text-white/80">
                  Watch the multiplier grow, cash out before it crashes
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProvablyFair(!showProvablyFair)}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Provably Fair
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            
            {/* Crash Result Display */}
            <div className="text-center py-12 bg-black/20 rounded-lg border border-white/10">
              <div className="relative">
                <div className="text-8xl mb-6 animate-pulse">🚀</div>
                {lastResult ? (
                  <div className="space-y-3">
                    <div className={`text-6xl font-bold ${getMultiplierColor(lastResult.crashPoint)}`}>
                      {lastResult.crashPoint.toFixed(2)}x
                    </div>
                    <div className={`text-2xl font-bold ${lastResult.won ? 'text-green-400' : 'text-red-400'}`}>
                      {lastResult.won ? '💰 CASHED OUT!' : '💥 CRASHED!'}
                    </div>
                    {lastResult.won && lastResult.cashoutMultiplier && (
                      <div className="text-white/80 text-lg">
                        Auto cashout at {lastResult.cashoutMultiplier.toFixed(2)}x
                      </div>
                    )}
                    <div className={`text-xl font-bold ${lastResult.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {lastResult.netResult >= 0 ? '+' : ''}{formatCurrency(Math.abs(lastResult.netResult))}
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl text-white/60">
                    Place your bet to launch the rocket
                  </div>
                )}
              </div>
            </div>

            {/* Betting Controls */}
            <div className="bg-black/20 rounded-lg p-6 border border-white/10">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white font-medium">Bet Amount (USD)</Label>
                    <div className="mt-1 relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        min={(userLimits.minBet / 100).toFixed(2)}
                        max={(userLimits.maxBet / 100).toFixed(2)}
                        step="0.01"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
                        placeholder="Enter bet amount"
                      />
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Min: {formatCurrency(userLimits.minBet)} • Max: {formatCurrency(userLimits.maxBet)}
                    </p>
                  </div>

                  <div>
                    <Label className="text-white font-medium">Auto Cashout Multiplier</Label>
                    <div className="mt-1 relative">
                      <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        min="1.01"
                        max="1000"
                        step="0.01"
                        value={autoCashout}
                        onChange={(e) => setAutoCashout(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
                        placeholder="Auto cashout at"
                      />
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Potential win: {formatCurrency(parseFloat(betAmount) * parseFloat(autoCashout) * 100)}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={placeBet}
                  disabled={loading || !wallet || parseFloat(betAmount) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3"
                  size="lg"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <Zap className="h-5 w-5 mr-2 animate-pulse" />
                      Launching Rocket...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Launch Rocket - {formatCurrency(parseFloat(betAmount) * 100)}
                    </div>
                  )}
                </Button>

                {/* Quick Bet Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount('1.00')}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    $1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount('5.00')}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    $5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount('10.00')}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    $10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount('50.00')}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    $50
                  </Button>
                </div>
              </div>
            </div>

            {/* Provably Fair Panel */}
            {showProvablyFair && currentProvablyFair && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-green-400 font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Provably Fair Verification
                  </h4>
                  {lastResult?.provablyFair.revealed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyProvablyFairData}
                      className="text-green-400 border-green-400/20 hover:bg-green-400/10"
                    >
                      Copy Data
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-white/60">Server Seed Hash:</span>
                    <span className="text-white truncate ml-2">{currentProvablyFair.serverSeedHash.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Client Seed:</span>
                    <span className="text-white">{currentProvablyFair.clientSeed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Nonce:</span>
                    <span className="text-white">{currentProvablyFair.nonce}</span>
                  </div>
                  
                  {lastResult?.provablyFair.revealed && (
                    <>
                      <hr className="border-white/20 my-3" />
                      <div className="text-green-400 font-medium mb-2">Last Round Verification:</div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Server Seed:</span>
                        <span className="text-green-400 truncate ml-2">{lastResult.provablyFair.revealed.serverSeed.substring(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Result:</span>
                        <span className="text-green-400">{lastResult.provablyFair.revealed.result.toFixed(2)}x</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Verified:</span>
                        <div className="flex items-center">
                          {lastResult.provablyFair.revealed.verified ? (
                            <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-400 mr-1" />
                          )}
                          <span className={lastResult.provablyFair.revealed.verified ? 'text-green-400' : 'text-red-400'}>
                            {lastResult.provablyFair.revealed.verified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-3 text-xs text-white/50">
                  <a 
                    href="/provably-fair/verifier" 
                    target="_blank" 
                    className="text-green-400 hover:text-green-300 underline"
                  >
                    Verify this result independently →
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Session Statistics */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Session Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-sm space-y-3">
              <div className="flex justify-between">
                <span>Games Played:</span>
                <span className="text-white font-medium">{sessionStats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Wagered:</span>
                <span className="text-white font-medium">{formatCurrency(sessionStats.totalWagered)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Won:</span>
                <span className="text-green-400 font-medium">{formatCurrency(sessionStats.totalWon)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Result:</span>
                <span className={`font-medium ${
                  sessionStats.totalWon - sessionStats.totalWagered >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {sessionStats.totalWon - sessionStats.totalWagered >= 0 ? '+' : ''}
                  {formatCurrency(sessionStats.totalWon - sessionStats.totalWagered)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Biggest Win:</span>
                <span className="text-yellow-400 font-medium">{formatCurrency(sessionStats.biggestWin)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Game Information */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Game Information</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-sm space-y-3">
              <div className="flex justify-between">
                <span>Return to Player (RTP):</span>
                <span className="text-green-400 font-medium">96.00%</span>
              </div>
              <div className="flex justify-between">
                <span>House Edge:</span>
                <span className="text-red-400 font-medium">4.00%</span>
              </div>
              <div className="flex justify-between">
                <span>Max Multiplier:</span>
                <span className="text-yellow-400 font-medium">10,000x</span>
              </div>
              <div className="flex justify-between">
                <span>Min Bet:</span>
                <span className="text-white font-medium">{formatCurrency(userLimits.minBet)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Bet:</span>
                <span className="text-white font-medium">{formatCurrency(userLimits.maxBet)}</span>
              </div>
              
              <hr className="border-white/20 my-3" />
              
              <div className="text-xs text-white/60 space-y-1">
                <p>• Certified RNG: {process.env.RNG_CERT_REF || 'GLI-19'}</p>
                <p>• Licensed in {jurisdiction}</p>
                <p>• Provably fair verification available</p>
                <p>• Real money gaming</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Crash History */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Recent Results</CardTitle>
              <CardDescription className="text-white/60">
                Last 20 crash multipliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {gameHistory.map((crashPoint, index) => (
                  <div
                    key={index}
                    className={`text-center p-2 rounded text-xs font-mono border ${
                      crashPoint < 1.5 
                        ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                        : crashPoint < 2.0
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                        : crashPoint < 5.0
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        : crashPoint < 10.0
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {crashPoint.toFixed(2)}x
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-xs text-white/50 text-center">
                <p>Statistics based on certified RNG results</p>
              </div>
            </CardContent>
          </Card>

          {/* Responsible Gambling Tools */}
          <Card className="bg-amber-500/10 backdrop-blur-sm border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-400 text-lg flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Stay in Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/responsible-gambling/tools">
                <Button 
                  variant="outline" 
                  className="w-full text-amber-300 border-amber-400/30 hover:bg-amber-400/10"
                >
                  Set Limits
                </Button>
              </Link>
              
              <div className="text-xs text-amber-300/80 space-y-1">
                <p>• Set deposit and loss limits</p>
                <p>• Take cooling-off breaks</p>
                <p>• Access self-exclusion tools</p>
                <p>• Monitor your gambling activity</p>
              </div>
              
              <div className="text-xs text-white/60 pt-2 border-t border-amber-500/20">
                <p>Need help? <a href="/support" className="text-amber-400 hover:underline">Contact Support</a></p>
                <p>Crisis help: <a href="https://www.gamcare.org.uk" className="text-amber-400 hover:underline">GamCare (24/7)</a></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
