import { PrismaClient, GameType } from '@prisma/client';
import { CASINO_CONFIG } from '../lib/casino/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🎰 Seeding casino data...');

  // Create demo wallet for guest users
  const demoWallet = await prisma.wallet.upsert({
    where: { id: 'demo-wallet-guest' },
    update: {
      balance: CASINO_CONFIG.DEMO_CREDITS.INITIAL_BALANCE,
    },
    create: {
      id: 'demo-wallet-guest',
      // userId: undefined, // Optional for guest wallet // Guest wallet
      balance: CASINO_CONFIG.DEMO_CREDITS.INITIAL_BALANCE,
    },
  });

  console.log('✅ Demo wallet created:', demoWallet);

  // Create some historical game rounds for each game type
  const gameTypes = Object.values(GameType);
  const historicalRounds = [];

  for (const gameType of gameTypes) {
    for (let i = 0; i < 3; i++) {
      const round = await prisma.gameRound.create({
        data: {
          game: gameType,
          state: 'CLOSED',
          startedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
          settledAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 + 60000), // 1 minute later
          serverSeed: `seed_${Math.random().toString(36).substring(2, 15)}`,
          clientSeed: `client_${Math.random().toString(36).substring(2, 15)}`,
          nonce: i + 1,
          resultJson: generateSampleResult(gameType),
        },
      });
      historicalRounds.push(round);
    }
  }

  console.log(`✅ Created ${historicalRounds.length} historical game rounds`);

  // Create some sample transactions
  const sampleTransactions = [];
  
  // Initial deposit transaction
  const initialDeposit = await prisma.walletTransaction.create({
    data: {
      walletId: demoWallet.id,
      amount: CASINO_CONFIG.DEMO_CREDITS.INITIAL_BALANCE,
      reason: 'INITIAL_DEPOSIT',
      referenceId: 'welcome-bonus',
    },
  });
  sampleTransactions.push(initialDeposit);

  // Some sample bet transactions
  for (let i = 0; i < 5; i++) {
    const stake = Math.floor(Math.random() * 2000) + 500; // 5-25 credits
    const isWin = Math.random() > 0.52; // ~48% win rate
    const payout = isWin ? Math.floor(stake * (1 + Math.random() * 2)) : 0;

    // Bet stake (negative)
    const stakeTransaction = await prisma.walletTransaction.create({
      data: {
        walletId: demoWallet.id,
        amount: -stake,
        reason: 'BET_STAKE',
        ref: `sample-bet-${i}`,
      },
    });
    sampleTransactions.push(stakeTransaction);

    // Payout (positive, if any)
    if (payout > 0) {
      const payoutTransaction = await prisma.walletTransaction.create({
        data: {
          walletId: demoWallet.id,
          amount: payout,
          reason: 'BET_PAYOUT',
          ref: `sample-bet-${i}`,
        },
      });
      sampleTransactions.push(payoutTransaction);
    }
  }

  console.log(`✅ Created ${sampleTransactions.length} sample transactions`);

  // Update wallet balance based on transactions
  const totalTransactions = await prisma.walletTransaction.aggregate({
    where: { walletId: demoWallet.id },
    _sum: { amount: true },
  });

  await prisma.wallet.update({
    where: { id: demoWallet.id },
    data: {
      balance: totalTransactions._sum.amount || CASINO_CONFIG.DEMO_CREDITS.INITIAL_BALANCE,
    },
  });

  console.log('✅ Casino seed data completed successfully!');
}

function generateSampleResult(gameType: GameType): any {
  switch (gameType) {
    case GameType.VEGETABLES:
      return {
        grid: [0, 0.5, 1, 1, 2, 2, 5, 10, 0], // Sample multiplier grid
        picks: [2, 4, 6], // Sample picks
        totalMultiplier: 4,
        won: true,
      };
    
    case GameType.DICE:
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      return {
        dice1,
        dice2,
        sum: dice1 + dice2,
        won: Math.random() > 0.5,
      };
    
    case GameType.SLOTS:
      return {
        reels: [
          ['A', 'K', 'Cherry'],
          ['Wild', 'A', 'K'],
          ['A', 'A', 'A'],
          ['A', 'Bell', 'Lemon'],
          ['King', 'A', 'Wild']
        ],
        paylines: [
          { line: 1, symbols: ['A', 'A', 'A'], payout: 200 }
        ],
        totalPayout: 200,
        won: true,
      };
    
    case GameType.CRASH:
      const crashPoint = Math.random() * 10 + 1;
      return {
        crashPoint: Math.floor(crashPoint * 100) / 100,
        cashedOut: Math.random() > 0.4,
        won: Math.random() > 0.4,
      };
    
    case GameType.DRAGON_TIGER:
      const dragonCard = Math.floor(Math.random() * 13) + 1;
      const tigerCard = Math.floor(Math.random() * 13) + 1;
      return {
        dragon: { value: dragonCard, suit: 'hearts' },
        tiger: { value: tigerCard, suit: 'spades' },
        result: dragonCard > tigerCard ? 'dragon' : tigerCard > dragonCard ? 'tiger' : 'tie',
        won: Math.random() > 0.5,
      };
    
    case GameType.WHEEL:
      const segments = [1, 2, 5, 10, 20, 50];
      const winningSegment = segments[Math.floor(Math.random() * segments.length)];
      return {
        winningSegment,
        multiplier: winningSegment,
        won: Math.random() > 0.5,
      };
    
    case GameType.HORSE_RACING:
      const horses = ['Thunder', 'Lightning', 'Storm', 'Blaze', 'Spirit', 'Champion'];
      const shuffled = [...horses].sort(() => Math.random() - 0.5);
      return {
        horses: horses.map((name, index) => ({
          name,
          position: index + 1,
          odds: Math.random() * 10 + 1,
        })),
        winner: shuffled[0],
        won: Math.random() > 0.5,
      };
    
    default:
      return { type: gameType, timestamp: Date.now() };
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
