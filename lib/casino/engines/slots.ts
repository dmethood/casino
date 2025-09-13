import { SeedPack, generateSlotReels } from '../rng';
import { logger } from '@/lib/logger';

export interface SlotsBetParams {
  selection: {
    lines?: number;
    betPerLine?: number;
  };
  stake: number; // In cents
  seedPack: SeedPack;
  houseEdge: number;
}

export interface SlotsOutcome {
  won: boolean;
  payout: number; // In cents
  result: {
    reels: string[][];
    winLines: Array<{
      line: number;
      symbols: string[];
      multiplier: number;
      payout: number;
    }>;
    totalPayout: number;
    won: boolean;
  };
  actualRTP?: number;
}

const SLOT_SYMBOLS = ['Wild', 'Scatter', 'A', 'K', 'Q', 'J', '10', 'Cherry', 'Lemon', 'Bell'];

const SYMBOL_VALUES = {
  'Wild': 50,
  'Scatter': 25,
  'A': 10,
  'K': 8,
  'Q': 6,
  'J': 5,
  '10': 4,
  'Cherry': 15,
  'Lemon': 12,
  'Bell': 20
};

export function settleSlotsBet(params: SlotsBetParams): SlotsOutcome {
  const { selection, stake, seedPack, houseEdge } = params;
  const lines = selection.lines || 20;
  const betPerLine = selection.betPerLine || Math.floor(stake / lines);

  // Generate slot reels using certified RNG
  const reels = generateSlotReels(seedPack, 5, 3); // 5 reels, 3 symbols each

  // Check for winning combinations
  const winLines = checkWinLines(reels, betPerLine, houseEdge);
  
  // Calculate total payout
  const totalPayout = winLines.reduce((sum, line) => sum + line.payout, 0);
  const won = totalPayout > 0;

  const result = {
    reels,
    winLines,
    totalPayout,
    won
  };

  logger.info('Slots bet settled', {
    stake,
    lines,
    betPerLine,
    winLines: winLines.length,
    totalPayout,
    won
  });

  return {
    won,
    payout: totalPayout,
    result,
    actualRTP: (totalPayout / stake) * 100
  };
}

function checkWinLines(reels: string[][], betPerLine: number, houseEdge: number): Array<{
  line: number;
  symbols: string[];
  multiplier: number;
  payout: number;
}> {
  const winLines = [];
  
  // Check horizontal lines (simplified - 3 matching symbols)
  for (let row = 0; row < 3; row++) {
    const lineSymbols = [reels[0][row], reels[1][row], reels[2][row]];
    
    // Check for 3 matching symbols
    if (lineSymbols[0] === lineSymbols[1] && lineSymbols[1] === lineSymbols[2]) {
      const symbol = lineSymbols[0];
      const baseMultiplier = SYMBOL_VALUES[symbol as keyof typeof SYMBOL_VALUES] || 1;
      const multiplier = baseMultiplier * (1 - houseEdge);
      const payout = Math.floor(betPerLine * multiplier);
      
      if (payout > 0) {
        winLines.push({
          line: row + 1,
          symbols: lineSymbols,
          multiplier,
          payout
        });
      }
    }
  }
  
  // Check for scatter symbols (simplified)
  const scatterCount = reels.flat().filter(symbol => symbol === 'Scatter').length;
  if (scatterCount >= 3) {
    const scatterMultiplier = Math.pow(2, scatterCount - 2) * (1 - houseEdge);
    const scatterPayout = Math.floor(betPerLine * scatterMultiplier);
    
    winLines.push({
      line: 0, // Special scatter line
      symbols: ['Scatter', 'Scatter', 'Scatter'],
      multiplier: scatterMultiplier,
      payout: scatterPayout
    });
  }

  return winLines;
}