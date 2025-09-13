// Production Game Engine Exports
export * from './vegetables';
export * from './dice';
export * from './slots';
export * from './crash';
export * from './blackjack';
export * from './roulette';
export * from './baccarat';

export const GAME_ENGINES = {
  VEGETABLES: () => import('./vegetables'),
  DICE: () => import('./dice'),
  SLOTS: () => import('./slots'),
  CRASH: () => import('./crash'),
  BLACKJACK: () => import('./blackjack'),
  ROULETTE: () => import('./roulette'),
  BACCARAT: () => import('./baccarat'),
} as const;

export type GameType = keyof typeof GAME_ENGINES;