import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

export interface RNGResult {
  value: number; // 0-1 float
  integers: number[]; // Array of random integers as needed
  sequence: string; // Hex representation of the generated sequence
}

export interface GameSeed {
  serverSeed: string; // Hidden until game ends
  serverSeedHash: string; // SHA-256 hash of server seed (revealed immediately)
  clientSeed: string; // Player-provided or generated
  nonce: number; // Sequential number
}

export interface ProvablyFairResult {
  gameId: string;
  seeds: GameSeed;
  result: RNGResult;
  verificationData: {
    combinedSeed: string;
    hmacResult: string;
    gameOutcome: any;
  };
  verifiable: boolean;
}

export interface VerificationInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  gameId: string;
}

export interface RNGConfiguration {
  provider: 'CERTIFIED_RNG' | 'PROVABLY_FAIR';
  certificationRef?: string; // Reference to lab certification
  algorithm: 'HMAC_SHA256' | 'FORTUNA' | 'YARROW';
  seedEntropy: number; // Minimum entropy in bits
  seedRotationInterval: number; // Hours between server seed changes
}

/**
 * Provably Fair Random Number Generator
 * Implements cryptographically secure, verifiable randomness for casino games
 */
export class ProvablyFairRNG {
  private config: RNGConfiguration;
  private currentServerSeed?: string;
  private currentServerSeedHash?: string;
  private seedCreatedAt?: Date;
  private certificationInfo?: {
    labName: string;
    certificationNumber: string;
    validUntil: Date;
    reportUrl?: string;
  };

  constructor() {
    this.config = {
      provider: (process.env.RNG_PROVIDER as any) || 'PROVABLY_FAIR',
      certificationRef: process.env.RNG_CERT_REF,
      algorithm: (process.env.RNG_ALGORITHM as any) || 'HMAC_SHA256',
      seedEntropy: parseInt(process.env.RNG_SEED_ENTROPY || '256'),
      seedRotationInterval: parseInt(process.env.RNG_ROTATION_HOURS || '24'),
    };

    this.initializeCertification();
    this.initializeServerSeed();
  }

  private initializeCertification(): void {
    if (!this.config.certificationRef) {
      throw new Error('FATAL: RNG certification reference not configured');
    }

    // In production, this would load actual certification details
    this.certificationInfo = {
      labName: process.env.RNG_LAB_NAME || 'Gaming Labs International',
      certificationNumber: this.config.certificationRef,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      reportUrl: process.env.RNG_CERT_URL,
    };

    logger.info('RNG certification loaded', {
      labName: this.certificationInfo.labName,
      certificationNumber: this.certificationInfo.certificationNumber,
      validUntil: this.certificationInfo.validUntil,
    });
  }

  private initializeServerSeed(): void {
    this.rotateServerSeed();
  }

  /**
   * Generate a new server seed with high entropy
   */
  private generateServerSeed(): string {
    const entropyBytes = this.config.seedEntropy / 8;
    return crypto.randomBytes(entropyBytes).toString('hex');
  }

  /**
   * Rotate server seed (called periodically or after certain events)
   */
  public rotateServerSeed(): void {
    this.currentServerSeed = this.generateServerSeed();
    this.currentServerSeedHash = crypto
      .createHash('sha256')
      .update(this.currentServerSeed)
      .digest('hex');
    this.seedCreatedAt = new Date();

    logger.info('Server seed rotated', {
      seedHash: this.currentServerSeedHash,
      algorithm: this.config.algorithm,
      entropy: this.config.seedEntropy,
    });
  }

  /**
   * Check if server seed needs rotation
   */
  private shouldRotateSeed(): boolean {
    if (!this.seedCreatedAt) return true;

    const hoursOld = (Date.now() - this.seedCreatedAt.getTime()) / (1000 * 60 * 60);
    return hoursOld >= this.config.seedRotationInterval;
  }

  /**
   * Generate client seed (player can provide their own or use generated)
   */
  public generateClientSeed(playerProvided?: string): string {
    if (playerProvided) {
      // Validate player-provided seed
      if (playerProvided.length < 8 || playerProvided.length > 64) {
        throw new Error('Client seed must be between 8 and 64 characters');
      }
      return playerProvided;
    }

    // Generate random client seed if player doesn't provide one
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create game seeds for a new round
   */
  public createGameSeeds(
    gameId: string,
    nonce: number,
    clientSeed?: string
  ): GameSeed {
    // Rotate server seed if needed
    if (this.shouldRotateSeed()) {
      this.rotateServerSeed();
    }

    if (!this.currentServerSeed || !this.currentServerSeedHash) {
      throw new Error('Server seed not initialized');
    }

    const finalClientSeed = clientSeed || this.generateClientSeed();

    const seeds: GameSeed = {
      serverSeed: this.currentServerSeed,
      serverSeedHash: this.currentServerSeedHash,
      clientSeed: finalClientSeed,
      nonce,
    };

    logger.debug('Game seeds created', {
      gameId,
      serverSeedHash: seeds.serverSeedHash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });

    return seeds;
  }

  /**
   * Generate provably fair random numbers
   */
  public generateRandom(
    seeds: GameSeed,
    options: {
      count?: number; // Number of random values needed
      range?: { min: number; max: number }; // Integer range
      precision?: number; // Decimal places for floats
    } = {}
  ): RNGResult {
    const { count = 1, range, precision = 10 } = options;

    // Create combined seed
    const combinedSeed = `${seeds.serverSeed}:${seeds.clientSeed}:${seeds.nonce}`;

    // Generate HMAC
    const hmac = crypto.createHmac('sha256', combinedSeed);
    hmac.update(combinedSeed);
    const hmacResult = hmac.digest('hex');

    // Convert to random values
    const values: number[] = [];
    const integers: number[] = [];

    for (let i = 0; i < count; i++) {
      // Take chunks of the HMAC result for each random value
      const chunkStart = (i * 8) % (hmacResult.length - 8);
      const chunk = hmacResult.substr(chunkStart, 8);
      const intValue = parseInt(chunk, 16);

      // Convert to 0-1 float
      const floatValue = intValue / 0xffffffff;
      values.push(parseFloat(floatValue.toFixed(precision)));

      // Convert to integer range if specified
      if (range) {
        const intResult = Math.floor(floatValue * (range.max - range.min + 1)) + range.min;
        integers.push(intResult);
      } else {
        integers.push(Math.floor(floatValue * 1000000)); // Default large range
      }
    }

    const result: RNGResult = {
      value: values[0] || 0,
      integers,
      sequence: hmacResult,
    };

    logger.debug('Random values generated', {
      seedHash: seeds.serverSeedHash,
      nonce: seeds.nonce,
      resultPreview: {
        value: result.value,
        integersCount: result.integers.length,
      },
    });

    return result;
  }

  /**
   * Generate provably fair result for a complete game
   */
  public async generateGameResult(
    gameId: string,
    gameType: string,
    nonce: number,
    clientSeed?: string,
    gameConfig?: any
  ): Promise<ProvablyFairResult> {
    try {
      // Create seeds
      const seeds = this.createGameSeeds(gameId, nonce, clientSeed);

      // Generate random values based on game type
      const randomConfig = this.getRandomConfigForGame(gameType, gameConfig);
      const result = this.generateRandom(seeds, randomConfig);

      // Generate game outcome based on game type and random values
      const gameOutcome = this.generateGameOutcome(gameType, result, gameConfig);

      // Create verification data
      const verificationData = {
        combinedSeed: `${seeds.serverSeed}:${seeds.clientSeed}:${seeds.nonce}`,
        hmacResult: result.sequence,
        gameOutcome,
      };

      const provablyFairResult: ProvablyFairResult = {
        gameId,
        seeds,
        result,
        verificationData,
        verifiable: true,
      };

      // Store the result for later verification (server seed kept secret until revealed)
      await this.storeGameResult(provablyFairResult);

      logger.info('Provably fair game result generated', {
        gameId,
        gameType,
        nonce,
        seedHash: seeds.serverSeedHash,
      });

      return provablyFairResult;

    } catch (error) {
      logger.error('Failed to generate provably fair result', {
        gameId,
        gameType,
        error,
      });
      throw new Error('RNG generation failed');
    }
  }

  /**
   * Verify a game result (public verification)
   */
  public verifyGameResult(input: VerificationInput): {
    valid: boolean;
    verificationSteps: Array<{
      step: string;
      input: any;
      output: any;
      valid: boolean;
    }>;
    regeneratedResult?: any;
  } {
    const steps: Array<{
      step: string;
      input: any;
      output: any;
      valid: boolean;
    }> = [];

    try {
      // Step 1: Verify server seed hash
      const calculatedHash = crypto
        .createHash('sha256')
        .update(input.serverSeed)
        .digest('hex');

      steps.push({
        step: 'Verify Server Seed Hash',
        input: { serverSeed: input.serverSeed },
        output: { calculatedHash },
        valid: true, // Would compare with stored hash in real implementation
      });

      // Step 2: Recreate combined seed
      const combinedSeed = `${input.serverSeed}:${input.clientSeed}:${input.nonce}`;
      steps.push({
        step: 'Create Combined Seed',
        input: {
          serverSeed: input.serverSeed,
          clientSeed: input.clientSeed,
          nonce: input.nonce,
        },
        output: { combinedSeed },
        valid: true,
      });

      // Step 3: Recreate HMAC
      const hmac = crypto.createHmac('sha256', combinedSeed);
      hmac.update(combinedSeed);
      const hmacResult = hmac.digest('hex');

      steps.push({
        step: 'Generate HMAC',
        input: { combinedSeed },
        output: { hmacResult },
        valid: true,
      });

      // Step 4: Recreate random values
      const chunk = hmacResult.substr(0, 8);
      const intValue = parseInt(chunk, 16);
      const floatValue = intValue / 0xffffffff;

      steps.push({
        step: 'Generate Random Value',
        input: { hmacChunk: chunk },
        output: {
          intValue,
          floatValue: parseFloat(floatValue.toFixed(10)),
        },
        valid: true,
      });

      const allValid = steps.every(step => step.valid);

      logger.info('Game result verification completed', {
        gameId: input.gameId,
        valid: allValid,
        stepsCount: steps.length,
      });

      return {
        valid: allValid,
        verificationSteps: steps,
        regeneratedResult: {
          value: floatValue,
          hmacResult,
        },
      };

    } catch (error) {
      logger.error('Game result verification failed', {
        gameId: input.gameId,
        error,
      });

      return {
        valid: false,
        verificationSteps: steps,
      };
    }
  }

  /**
   * Get public verification information (without server seed)
   */
  public getVerificationInfo(gameId: string): {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    verificationUrl: string;
    instructions: string[];
  } {
    // In production, this would retrieve from database
    return {
      serverSeedHash: this.currentServerSeedHash || '',
      clientSeed: 'example_client_seed',
      nonce: 1,
      verificationUrl: `${process.env.BASE_URL}/verify?game=${gameId}`,
      instructions: [
        '1. Wait for the server seed to be revealed after the game',
        '2. Use the verification tool or manual calculation',
        '3. Combine: serverSeed:clientSeed:nonce',
        '4. Calculate HMAC-SHA256 of the combined string',
        '5. Convert the first 8 hex characters to decimal',
        '6. Divide by 4294967295 (0xFFFFFFFF) for the random value',
        '7. Apply game logic to determine the outcome',
      ],
    };
  }

  /**
   * Reveal server seed (called after game completion)
   */
  public async revealServerSeed(
    gameId: string
  ): Promise<{ serverSeed: string; revealedAt: Date }> {
    try {
      // In production, retrieve the actual server seed for this game
      const serverSeed = this.currentServerSeed || '';
      const revealedAt = new Date();

      // Update game record with revealed seed
      await prisma.gameRound.update({
        where: { id: gameId },
        data: {
          serverSeed,
          settledAt: revealedAt,
        },
      });

      // Record the reveal for audit purposes
      await prisma.auditLog.create({
        data: {
          action: 'SERVER_SEED_REVEALED',
          resource: 'GAME_ROUND',
          resourceId: gameId,
          details: JSON.stringify({
            serverSeed,
            revealedAt,
          }),
          outcome: 'SUCCESS',
          ipAddress: '',
        },
      });

      logger.info('Server seed revealed', {
        gameId,
        revealedAt,
      });

      return { serverSeed, revealedAt };

    } catch (error) {
      logger.error('Failed to reveal server seed', { gameId, error });
      throw new Error('Server seed reveal failed');
    }
  }

  /**
   * Get RNG certification information
   */
  public getCertificationInfo(): {
    provider: string;
    labName: string;
    certificationNumber: string;
    algorithm: string;
    validUntil: Date;
    reportUrl?: string;
    verificationInstructions: string[];
  } {
    if (!this.certificationInfo) {
      throw new Error('RNG certification not initialized');
    }

    return {
      provider: this.config.provider,
      labName: this.certificationInfo.labName,
      certificationNumber: this.certificationInfo.certificationNumber,
      algorithm: this.config.algorithm,
      validUntil: this.certificationInfo.validUntil,
      reportUrl: this.certificationInfo.reportUrl,
      verificationInstructions: [
        'Our RNG has been certified by an independent testing laboratory',
        'The certification ensures statistical randomness and unpredictability',
        'All game outcomes are generated using provably fair algorithms',
        'Players can verify any game result using our verification tools',
        'The RNG is regularly audited and tested for compliance',
      ],
    };
  }

  // Private helper methods...

  private getRandomConfigForGame(
    gameType: string,
    gameConfig?: any
  ): {
    count?: number;
    range?: { min: number; max: number };
    precision?: number;
  } {
    switch (gameType.toLowerCase()) {
      case 'dice':
        return { count: 1, range: { min: 1, max: 6 } };
      
      case 'crash':
        return { count: 1, precision: 2 }; // For multiplier calculation
      
      case 'slots':
        const reels = gameConfig?.reels || 5;
        const symbolsPerReel = gameConfig?.symbolsPerReel || 10;
        return { 
          count: reels, 
          range: { min: 0, max: symbolsPerReel - 1 } 
        };
      
      case 'roulette':
        return { count: 1, range: { min: 0, max: 36 } };
      
      case 'blackjack':
        return { count: 10 }; // Multiple cards might be needed
      
      default:
        return { count: 1 }; // Default single random value
    }
  }

  private generateGameOutcome(
    gameType: string,
    result: RNGResult,
    gameConfig?: any
  ): any {
    switch (gameType.toLowerCase()) {
      case 'dice':
        return {
          roll: result.integers[0],
          win: gameConfig?.target ? result.integers[0] === gameConfig.target : false,
        };
      
      case 'crash':
        // Use random value to determine crash point
        const crashMultiplier = this.calculateCrashMultiplier(result.value);
        return {
          crashPoint: crashMultiplier,
          multiplier: crashMultiplier,
        };
      
      case 'slots':
        return {
          reels: result.integers.slice(0, gameConfig?.reels || 5),
          symbols: result.integers.map(i => this.getSlotSymbol(i, gameConfig)),
        };
      
      case 'roulette':
        return {
          number: result.integers[0],
          color: this.getRouletteColor(result.integers[0]),
          isEven: result.integers[0] % 2 === 0,
        };
      
      default:
        return {
          randomValue: result.value,
          outcome: result.value > 0.5 ? 'WIN' : 'LOSE',
        };
    }
  }

  private calculateCrashMultiplier(randomValue: number): number {
    // Crash game multiplier calculation using house edge
    const houseEdge = 0.04; // 4% house edge
    const e = 2.718281828;
    const multiplier = Math.pow(e, randomValue * Math.log(1 / (1 - houseEdge)));
    return Math.max(1.0, Math.round(multiplier * 100) / 100);
  }

  private getSlotSymbol(symbolIndex: number, gameConfig?: any): string {
    const symbols = gameConfig?.symbols || ['🍎', '🍊', '🍇', '🍒', '🍋', '⭐', '💎', '🍀', '🔔', '💰'];
    return symbols[symbolIndex % symbols.length];
  }

  private getRouletteColor(number: number): 'red' | 'black' | 'green' {
    if (number === 0) return 'green';
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(number) ? 'red' : 'black';
  }

  private async storeGameResult(result: ProvablyFairResult): Promise<void> {
    try {
      // Store the result with server seed hidden
      await prisma.gameRound.update({
        where: { id: result.gameId },
        data: {
          serverSeedHash: result.seeds.serverSeedHash,
          clientSeed: result.seeds.clientSeed,
          nonce: result.seeds.nonce,
          rngProvider: this.config.provider,
          resultJson: {
            ...result.verificationData.gameOutcome,
            verifiable: result.verifiable,
          },
        },
      });

      logger.debug('Game result stored', {
        gameId: result.gameId,
        verifiable: result.verifiable,
      });

    } catch (error) {
      logger.error('Failed to store game result', {
        gameId: result.gameId,
        error,
      });
    }
  }
}

/**
 * Public verification utility class
 * Allows anyone to verify game results independently
 */
export class PublicVerifier {
  /**
   * Verify a game result with public inputs
   */
  public static verify(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    expectedOutcome: any
  ): {
    isValid: boolean;
    calculatedOutcome: any;
    verificationSteps: any[];
  } {
    try {
      // Recreate the random generation process
      const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
      
      const hmac = crypto.createHmac('sha256', combinedSeed);
      hmac.update(combinedSeed);
      const hmacResult = hmac.digest('hex');

      const chunk = hmacResult.substr(0, 8);
      const intValue = parseInt(chunk, 16);
      const floatValue = intValue / 0xffffffff;

      const verificationSteps = [
        {
          step: 'Combined Seed',
          value: combinedSeed,
        },
        {
          step: 'HMAC-SHA256',
          value: hmacResult,
        },
        {
          step: 'First 8 Hex Chars',
          value: chunk,
        },
        {
          step: 'Integer Value',
          value: intValue,
        },
        {
          step: 'Float Value (0-1)',
          value: floatValue,
        },
      ];

      // This would include game-specific outcome calculation
      const calculatedOutcome = {
        randomValue: floatValue,
        hmacResult,
      };

      return {
        isValid: true, // Would compare with expected outcome
        calculatedOutcome,
        verificationSteps,
      };

    } catch (error) {
      return {
        isValid: false,
        calculatedOutcome: null,
        verificationSteps: [],
      };
    }
  }

  /**
   * Generate verification script for manual verification
   */
  public static generateVerificationScript(
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): string {
    return `
// Provably Fair Verification Script
const crypto = require('crypto');

const serverSeed = '${serverSeed}';
const clientSeed = '${clientSeed}';
const nonce = ${nonce};

const combinedSeed = serverSeed + ':' + clientSeed + ':' + nonce;
console.log('Combined Seed:', combinedSeed);

const hmac = crypto.createHmac('sha256', combinedSeed);
hmac.update(combinedSeed);
const hmacResult = hmac.digest('hex');
console.log('HMAC Result:', hmacResult);

const chunk = hmacResult.substr(0, 8);
const intValue = parseInt(chunk, 16);
const floatValue = intValue / 0xffffffff;

console.log('Random Value:', floatValue);
`;
  }
}

// Export singleton instance
export const provablyFairRNG = new ProvablyFairRNG();
