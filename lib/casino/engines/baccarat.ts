import { SeedPack, createRNG } from '../rng';
import { logger } from '@/lib/logger';

export interface BaccaratBetParams {
  selection: {
    bet: 'player' | 'banker' | 'tie';
  };
  stake: number;
  seedPack: SeedPack;
  houseEdge: number;
}

export interface BaccaratOutcome {
  won: boolean;
  payout: number;
  result: {
    playerHand: number[];
    bankerHand: number[];
    playerTotal: number;
    bankerTotal: number;
    winner: 'player' | 'banker' | 'tie';
  };
  actualRTP?: number;
}

const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];

export function settleBaccaratBet(params: BaccaratBetParams): BaccaratOutcome {
  const { selection, stake, seedPack, houseEdge } = params;
  const serverRNG = createRNG();
  
  const playerHand = [
    CARD_VALUES[serverRNG.generateInteger(seedPack, 0, 12)],
    CARD_VALUES[serverRNG.generateInteger({ ...seedPack, nonce: seedPack.nonce + 1 }, 0, 12)]
  ];
  
  const bankerHand = [
    CARD_VALUES[serverRNG.generateInteger({ ...seedPack, nonce: seedPack.nonce + 2 }, 0, 12)],
    CARD_VALUES[serverRNG.generateInteger({ ...seedPack, nonce: seedPack.nonce + 3 }, 0, 12)]
  ];
  
  let playerTotal = (playerHand[0] + playerHand[1]) % 10;
  let bankerTotal = (bankerHand[0] + bankerHand[1]) % 10;
  
  let winner: 'player' | 'banker' | 'tie';
  if (playerTotal > bankerTotal) {
    winner = 'player';
  } else if (bankerTotal > playerTotal) {
    winner = 'banker';
  } else {
    winner = 'tie';
  }
  
  let multiplier = 0;
  const won = selection.bet === winner;
  
  if (won) {
    switch (selection.bet) {
      case 'player':
        multiplier = 2;
        break;
      case 'banker':
        multiplier = 1.95;
        break;
      case 'tie':
        multiplier = 9;
        break;
    }
  }
  
  const payout = won ? Math.floor(stake * multiplier * (1 - houseEdge)) : 0;
  
  logger.info('Baccarat bet settled', {
    stake,
    playerTotal,
    bankerTotal,
    winner,
    bet: selection.bet,
    won,
    payout
  });
  
  return {
    won,
    payout,
    result: {
      playerHand,
      bankerHand,
      playerTotal,
      bankerTotal,
      winner
    },
    actualRTP: (payout / stake) * 100
  };
}