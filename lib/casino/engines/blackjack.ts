import { SeedPack, createRNG } from '../rng';
import { CASINO_CONFIG } from '../config';
import { logger } from '@/lib/logger';

export interface BlackjackBetParams {
  selection: {
    action: 'hit' | 'stand' | 'double' | 'split';
    hand?: number; // For split hands
  };
  stake: number;
  seedPack: SeedPack;
  houseEdge: number;
}

export interface BlackjackOutcome {
  won: boolean;
  payout: number;
  result: {
    playerHand: number[];
    dealerHand: number[];
    playerTotal: number;
    dealerTotal: number;
    outcome: 'win' | 'lose' | 'push' | 'blackjack';
  };
  actualRTP?: number;
}

export function settleBlackjackBet(params: BlackjackBetParams): BlackjackOutcome {
  const { selection, stake, seedPack, houseEdge } = params;
  const serverRNG = createRNG();
  
  // Generate cards (simplified implementation)
  const playerHand = [
    serverRNG.generateInteger(seedPack, 1, 11),
    serverRNG.generateInteger(seedPack, 1, 11)
  ];
  
  const dealerHand = [
    serverRNG.generateInteger(seedPack, 1, 11),
    serverRNG.generateInteger(seedPack, 1, 11)
  ];
  
  const playerTotal = playerHand.reduce((sum, card) => sum + card, 0);
  const dealerTotal = dealerHand.reduce((sum, card) => sum + card, 0);
  
  let outcome: 'win' | 'lose' | 'push' | 'blackjack' = 'lose';
  let payout = 0;
  
  if (playerTotal === 21) {
    outcome = 'blackjack';
    payout = Math.floor(stake * 2.5 * (1 - houseEdge));
  } else if (playerTotal > 21) {
    outcome = 'lose';
    payout = 0;
  } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
    outcome = 'win';
    payout = Math.floor(stake * 2 * (1 - houseEdge));
  } else if (playerTotal === dealerTotal) {
    outcome = 'push';
    payout = stake;
  }
  
  const won = payout > stake;
  
  logger.info('Blackjack bet settled', {
    stake,
    playerTotal,
    dealerTotal,
    outcome,
    payout,
    won
  });
  
  return {
    won,
    payout,
    result: {
      playerHand,
      dealerHand,
      playerTotal,
      dealerTotal,
      outcome
    },
    actualRTP: (payout / stake) * 100
  };
}