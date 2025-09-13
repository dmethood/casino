import { SeedPack, serverRNG } from '../rng';
import { logger } from '@/lib/logger';

export interface CrashBetParams {
  selection: {
    autoCashout: number;
  };
  stake: number; // In cents
  seedPack: SeedPack;
  houseEdge: number;
  jurisdiction?: string;
}

export interface CrashOutcome {
  won: boolean;
  payout: number; // In cents
  result: {
    crashPoint: number;
    cashedOut: boolean;
    cashoutMultiplier?: number;
    payout: number;
  };
  actualRTP?: number;
}

export function settleCrashBet(params: CrashBetParams): CrashOutcome {
  const { selection, stake, seedPack, houseEdge } = params;
  const autoCashout = selection.autoCashout || 1.01;

  // Generate crash point using certified RNG
  const crashPoint = serverRNG.generateCrashMultiplier(seedPack, houseEdge);

  // Determine if player cashed out in time
  const cashedOut = autoCashout <= crashPoint;
  const won = cashedOut;

  // Calculate payout
  let payout = 0;
  if (won) {
    payout = Math.floor(stake * autoCashout);
  }

  const result = {
    crashPoint: Math.round(crashPoint * 100) / 100, // Round to 2 decimals
    cashedOut,
    cashoutMultiplier: cashedOut ? autoCashout : undefined,
    payout,
    won
  };

  logger.info('Crash bet settled', {
    stake,
    crashPoint: result.crashPoint,
    autoCashout,
    won,
    payout,
    jurisdiction: params.jurisdiction
  });

  return {
    won,
    payout,
    result,
    actualRTP: won ? (payout / stake) * 100 : 0
  };
}