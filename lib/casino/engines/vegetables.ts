import { SeedPack, serverRNG } from '../rng';
import { logger } from '@/lib/logger';

export interface VegetablesBetParams {
  selection: {
    vegetables: string[];
    betType: 'single' | 'multiple';
  };
  stake: number; // In cents
  seedPack: SeedPack;
  houseEdge: number;
}

export interface VegetablesOutcome {
  won: boolean;
  payout: number; // In cents
  result: {
    drawnVegetables: string[];
    playerVegetables: string[];
    matches: string[];
    won: boolean;
    payout: number;
  };
  actualRTP?: number;
}

const VEGETABLES = [
  'Carrot', 'Broccoli', 'Potato', 'Tomato', 'Onion', 
  'Cucumber', 'Pepper', 'Lettuce', 'Spinach', 'Cabbage',
  'Corn', 'Peas', 'Beans', 'Celery', 'Radish'
];

export function settleVegetablesBet(params: VegetablesBetParams): VegetablesOutcome {
  const { selection, stake, seedPack, houseEdge } = params;
  const { vegetables: playerVegetables, betType } = selection;

  // Draw random vegetables using certified RNG
  const drawCount = 5; // Draw 5 vegetables
  const drawnVegetables: string[] = [];
  
  for (let i = 0; i < drawCount; i++) {
    const vegetableIndex = serverRNG.generateInteger({
      ...seedPack,
      nonce: seedPack.nonce + i
    }, 0, VEGETABLES.length - 1);
    
    drawnVegetables.push(VEGETABLES[vegetableIndex]);
  }

  // Find matches
  const matches = playerVegetables.filter(v => drawnVegetables.includes(v));

  // Determine if bet won and calculate payout
  let won = false;
  let multiplier = 1;

  if (betType === 'single') {
    // Single vegetable bet - need exact match
    won = matches.length > 0;
    multiplier = calculateSingleMultiplier(matches.length, houseEdge);
  } else {
    // Multiple vegetable bet - need all matches
    won = matches.length === playerVegetables.length;
    multiplier = calculateMultipleMultiplier(playerVegetables.length, matches.length, houseEdge);
  }

  const payout = won ? Math.floor(stake * multiplier) : 0;

  const result = {
    drawnVegetables,
    playerVegetables,
    matches,
    won,
    payout
  };

  logger.info('Vegetables bet settled', {
    stake,
    playerVegetables: playerVegetables.length,
    matches: matches.length,
    won,
    payout
  });

  return {
    won,
    payout,
    result,
    actualRTP: won ? (payout / stake) * 100 : 0
  };
}

function calculateSingleMultiplier(matchCount: number, houseEdge: number): number {
  // Base multiplier for single vegetable matches
  const baseMultipliers = {
    1: 2.5,
    2: 5.0,
    3: 10.0,
    4: 25.0,
    5: 50.0
  };
  
  const baseMultiplier = baseMultipliers[Math.min(matchCount, 5) as keyof typeof baseMultipliers] || 1;
  return baseMultiplier * (1 - houseEdge);
}

function calculateMultipleMultiplier(betCount: number, matchCount: number, houseEdge: number): number {
  if (matchCount !== betCount) return 0; // Must match all
  
  // Multiplier based on difficulty
  const difficultyMultipliers = {
    1: 1.5,
    2: 3.0,
    3: 8.0,
    4: 20.0,
    5: 50.0
  };
  
  const baseMultiplier = difficultyMultipliers[betCount as keyof typeof difficultyMultipliers] || 1;
  return baseMultiplier * (1 - houseEdge);
}