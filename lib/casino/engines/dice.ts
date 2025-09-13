import { SeedPack, generateDiceRoll } from '../rng';
import { logger } from '@/lib/logger';

export interface DiceBetParams {
  selection: {
    bet: 'over' | 'under' | 'exact';
    target: number;
  };
  stake: number; // In cents
  seedPack: SeedPack;
  houseEdge: number;
}

export interface DiceOutcome {
  won: boolean;
  payout: number; // In cents
  result: {
    dice1: number;
    dice2: number;
    sum: number;
    target: number;
    bet: string;
    won: boolean;
    payout: number;
  };
  actualRTP?: number;
}

export function settleDiceBet(params: DiceBetParams): DiceOutcome {
  const { selection, stake, seedPack, houseEdge } = params;
  const { bet, target } = selection;

  // Generate dice roll using certified RNG
  const diceResult = generateDiceRoll(seedPack);
  const { dice1, dice2, sum } = diceResult;

  // Determine if bet won
  let won = false;
  let multiplier = 1;

  switch (bet) {
    case 'over':
      won = sum > target;
      multiplier = calculateOverUnderMultiplier(target, 'over', houseEdge);
      break;
    case 'under':
      won = sum < target;
      multiplier = calculateOverUnderMultiplier(target, 'under', houseEdge);
      break;
    case 'exact':
      won = sum === target;
      multiplier = calculateExactMultiplier(target, houseEdge);
      break;
  }

  // Calculate payout
  const payout = won ? Math.floor(stake * multiplier) : 0;

  const result = {
    dice1,
    dice2,
    sum,
    target,
    bet,
    won,
    payout
  };

  logger.info('Dice bet settled', {
    stake,
    dice1,
    dice2,
    sum,
    target,
    bet,
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

function calculateOverUnderMultiplier(target: number, bet: 'over' | 'under', houseEdge: number): number {
  // Calculate true odds based on probability
  let probability: number;
  
  if (bet === 'over') {
    // Probability of rolling over target (2-12 range)
    const waysToWin = getWaysToWin('over', target);
    probability = waysToWin / 36; // 36 total possible outcomes
  } else {
    // Probability of rolling under target
    const waysToWin = getWaysToWin('under', target);
    probability = waysToWin / 36;
  }
  
  // Apply house edge
  const trueOdds = 1 / probability;
  return trueOdds * (1 - houseEdge);
}

function calculateExactMultiplier(target: number, houseEdge: number): number {
  // Exact number probability
  const waysToWin = getWaysToWin('exact', target);
  const probability = waysToWin / 36;
  const trueOdds = 1 / probability;
  return trueOdds * (1 - houseEdge);
}

function getWaysToWin(bet: 'over' | 'under' | 'exact', target: number): number {
  if (bet === 'exact') {
    // Ways to get exact sum
    const ways = {
      2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
      8: 5, 9: 4, 10: 3, 11: 2, 12: 1
    };
    return ways[target as keyof typeof ways] || 0;
  } else if (bet === 'over') {
    let ways = 0;
    for (let sum = target + 1; sum <= 12; sum++) {
      ways += getWaysToWin('exact', sum);
    }
    return ways;
  } else { // under
    let ways = 0;
    for (let sum = 2; sum < target; sum++) {
      ways += getWaysToWin('exact', sum);
    }
    return ways;
  }
}