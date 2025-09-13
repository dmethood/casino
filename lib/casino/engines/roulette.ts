import { SeedPack, createRNG } from '../rng';
import { CASINO_CONFIG } from '../config';
import { logger } from '@/lib/logger';

export interface RouletteBetParams {
  selection: {
    betType: 'straight' | 'split' | 'street' | 'corner' | 'red' | 'black' | 'odd' | 'even';
    numbers: number[];
  };
  stake: number;
  seedPack: SeedPack;
  houseEdge: number;
}

export interface RouletteOutcome {
  won: boolean;
  payout: number;
  result: {
    winningNumber: number;
    color: 'red' | 'black' | 'green';
    won: boolean;
    payout: number;
  };
  actualRTP?: number;
}

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMBERS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

export function settleRouletteBet(params: RouletteBetParams): RouletteOutcome {
  const { selection, stake, seedPack, houseEdge } = params;
  const serverRNG = createRNG();
  
  // Generate winning number (0-36 for European roulette)
  const winningNumber = serverRNG.generateInteger(seedPack, 0, 36);
  
  let color: 'red' | 'black' | 'green' = 'green';
  if (RED_NUMBERS.includes(winningNumber)) color = 'red';
  else if (BLACK_NUMBERS.includes(winningNumber)) color = 'black';
  
  let won = false;
  let multiplier = 0;
  
  switch (selection.betType) {
    case 'straight':
      won = selection.numbers.includes(winningNumber);
      multiplier = 35;
      break;
    case 'red':
      won = color === 'red';
      multiplier = 1;
      break;
    case 'black':
      won = color === 'black';
      multiplier = 1;
      break;
    case 'odd':
      won = winningNumber > 0 && winningNumber % 2 === 1;
      multiplier = 1;
      break;
    case 'even':
      won = winningNumber > 0 && winningNumber % 2 === 0;
      multiplier = 1;
      break;
  }
  
  const payout = won ? Math.floor(stake * (multiplier + 1) * (1 - houseEdge)) : 0;
  
  logger.info('Roulette bet settled', {
    stake,
    winningNumber,
    color,
    betType: selection.betType,
    won,
    payout
  });
  
  return {
    won,
    payout,
    result: {
      winningNumber,
      color,
      won,
      payout
    },
    actualRTP: (payout / stake) * 100
  };
}