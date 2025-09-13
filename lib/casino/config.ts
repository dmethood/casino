// Casino Configuration - Production Settings
// Demo Credits Only - No Real Money

export const CASINO_CONFIG = {
  // Feature Flag
  ENABLED: process.env.CASINO_ENABLED === 'true' || false,
  
  // Jurisdiction Control (for demo, allow all common regions)
  JURISDICTION_ALLOWLIST: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'DK', 'NO', 'FI'],
  
  // Demo Credits Configuration
  DEMO_CREDITS: {
    INITIAL_BALANCE: 100000, // 1,000.00 in cents
    DAILY_BONUS: 50000,      // 500.00 in cents
    MIN_BET: 100,            // 1.00 in cents
    MAX_BET: 10000,          // 100.00 in cents
  },

  // Game Configuration
  GAMES: {
    VEGETABLES: {
      enabled: true,
      rtp: 96.0,
      gridSize: 9,
      maxPicks: 3,
    },
    DICE: {
      enabled: true,
      rtp: 96.0,
      minBet: 100,
      maxBet: 10000,
    },
    SLOTS: {
      enabled: true,
      rtp: 96.0,
      paylines: 10,
      reels: 5,
    },
    CRASH: {
      enabled: true,
      rtp: 96.0,
      houseEdge: 0.04,
      maxMultiplier: 1000,
    },
    DRAGON_TIGER: {
      enabled: true,
      rtp: 96.0,
      decks: 8,
    },
    WHEEL: {
      enabled: true,
      rtp: 96.0,
      segments: 54,
    },
    HORSE_RACING: {
      enabled: true,
      rtp: 96.0,
      horses: 6,
    },
  },

  // Safety & Compliance
  SAFETY: {
    AGE_MINIMUM: 18,
    DEMO_ONLY: true, // Always true - no real money
    RESPONSIBLE_PLAY_URL: 'https://example.org/responsible-play',
    SESSION_LIMIT_MINUTES: 120, // 2 hours
    LOSS_LIMIT_DEMO_CREDITS: 50000, // 500.00 in cents
  },

  // Rate Limiting
  RATE_LIMITS: {
    BETS_PER_MINUTE: 60,
    REQUESTS_PER_MINUTE: 100,
  },

  // RTP Bounds
  RTP: {
    MIN: 90,
    MAX: 98,
    DEFAULT: 96,
  },
} as const;

// Validation
if (typeof window === 'undefined') {
  // Server-side validation
  Object.values(CASINO_CONFIG.GAMES).forEach(game => {
    if (game.rtp < CASINO_CONFIG.RTP.MIN || game.rtp > CASINO_CONFIG.RTP.MAX) {
      console.warn(`⚠️ Casino game RTP out of bounds: ${game.rtp}%`);
    }
  });
}

export type CasinoGameType = keyof typeof CASINO_CONFIG.GAMES;
