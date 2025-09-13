import { createHash, createHmac, randomBytes } from 'crypto';

export interface SeedPack {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface ProvablyFairCommit {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  timestamp: number;
}

export interface ProvablyFairReveal {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  result: any;
  timestamp: number;
  verified: boolean;
}

class CryptoRNG {
  private currentServerSeed: string = "";
  private currentServerSeedHash: string = "";
  private currentNonce: number = 0;

  constructor() {
    this.generateNewServerSeed();
  }

  private generateNewServerSeed(): void {
    this.currentServerSeed = randomBytes(32).toString('hex');
    this.currentServerSeedHash = createHash('sha256')
      .update(this.currentServerSeed)
      .digest('hex');
    this.currentNonce = 0;
  }

  public createCommit(clientSeed?: string): ProvablyFairCommit {
    const finalClientSeed = clientSeed || randomBytes(16).toString('hex');
    
    return {
      serverSeedHash: this.currentServerSeedHash,
      clientSeed: finalClientSeed,
      nonce: this.currentNonce,
      timestamp: Date.now(),
    };
  }

  public generateSeedPack(clientSeed?: string): SeedPack {
    const finalClientSeed = clientSeed || randomBytes(16).toString('hex');
    
    return {
      serverSeed: this.currentServerSeed,
      serverSeedHash: this.currentServerSeedHash,
      clientSeed: finalClientSeed,
      nonce: this.currentNonce++,
    };
  }

  public generateRandomBytes(seedPack: SeedPack, byteCount: number): Buffer {
    const message = `${seedPack.clientSeed}:${seedPack.nonce}`;
    const hmac = createHmac('sha256', seedPack.serverSeed);
    hmac.update(message);
    
    let hash = hmac.digest();
    
    // If we need more bytes than one hash provides, generate additional hashes
    if (byteCount <= 32) {
      return hash.subarray(0, byteCount);
    }
    
    const result = Buffer.alloc(byteCount);
    let offset = 0;
    let counter = 0;
    
    while (offset < byteCount) {
      const counterMessage = `${message}:${counter}`;
      const counterHmac = createHmac('sha256', seedPack.serverSeed);
      counterHmac.update(counterMessage);
      hash = counterHmac.digest();
      
      const remaining = byteCount - offset;
      const toCopy = Math.min(32, remaining);
      hash.copy(result, offset, 0, toCopy);
      
      offset += toCopy;
      counter++;
    }
    
    return result;
  }

  public generateFloat(seedPack: SeedPack, min: number = 0, max: number = 1): number {
    const bytes = this.generateRandomBytes(seedPack, 8);
    
    // Convert 8 bytes to a number between 0 and 1
    let value = 0;
    for (let i = 0; i < 8; i++) {
      value = (value * 256 + bytes[i]) / 256;
    }
    
    // Normalize to range [0, 1) and then scale to [min, max)
    value = value / 256;
    return min + (value * (max - min));
  }

  public generateInteger(seedPack: SeedPack, min: number, max: number): number {
    const range = max - min + 1;
    const bytes = this.generateRandomBytes(seedPack, 4);
    const value = bytes.readUInt32BE(0);
    return min + (value % range);
  }

  public generateBoolean(seedPack: SeedPack, probability: number = 0.5): boolean {
    const float = this.generateFloat(seedPack);
    return float < probability;
  }

  public shuffle<T>(seedPack: SeedPack, array: T[]): T[] {
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const shuffleSeed = {
        ...seedPack,
        nonce: seedPack.nonce + i,
      };
      
      const j = this.generateInteger(shuffleSeed, 0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  public generateCrashMultiplier(seedPack: SeedPack, houseEdge: number = 0.04): number {
    const r = this.generateFloat(seedPack);
    
    // Crash game formula with house edge
    const crashPoint = 1 / (r * (1 - houseEdge));
    
    // Round to 2 decimal places and ensure minimum of 1.00x
    return Math.max(1.00, Math.floor(crashPoint * 100) / 100);
  }

  public createReveal(seedPack: SeedPack, result: any): ProvablyFairReveal {
    const verified = this.verifyServerSeed(seedPack);
    
    return {
      serverSeed: seedPack.serverSeed,
      serverSeedHash: seedPack.serverSeedHash,
      clientSeed: seedPack.clientSeed,
      nonce: seedPack.nonce,
      result,
      timestamp: Date.now(),
      verified,
    };
  }

  public verifyServerSeed(seedPack: SeedPack): boolean {
    const computedHash = createHash('sha256')
      .update(seedPack.serverSeed)
      .digest('hex');
    
    return computedHash === seedPack.serverSeedHash;
  }

  public rotateServerSeed(): string {
    const oldSeed = this.currentServerSeed;
    this.generateNewServerSeed();
    return oldSeed;
  }

  public getCurrentCommit(): string {
    return this.currentServerSeedHash;
  }
}

// Singleton instance for server use
export const serverRNG = new CryptoRNG();

// Utility functions for specific game mechanics
export function generateDiceRoll(seedPack: SeedPack): { dice1: number; dice2: number; sum: number } {
  const rng = new CryptoRNG();
  const dice1 = rng.generateInteger(seedPack, 1, 6);
  const dice2 = rng.generateInteger({
    ...seedPack,
    nonce: seedPack.nonce + 1,
  }, 1, 6);
  
  return { dice1, dice2, sum: dice1 + dice2 };
}

export function generateCardValue(seedPack: SeedPack): number {
  const rng = new CryptoRNG();
  return rng.generateInteger(seedPack, 1, 13); // Ace = 1, King = 13
}

export function generateWheelResult(seedPack: SeedPack, segments: number[]): { segment: number; value: number } {
  const rng = new CryptoRNG();
  const totalWeight = segments.reduce((sum, weight) => sum + weight, 0);
  const randomValue = rng.generateInteger(seedPack, 0, totalWeight - 1);
  
  let currentWeight = 0;
  for (let i = 0; i < segments.length; i++) {
    currentWeight += segments[i];
    if (randomValue < currentWeight) {
      return { segment: i, value: segments[i] };
    }
  }
  
  return { segment: segments.length - 1, value: segments[segments.length - 1] };
}

export function generateSlotReels(seedPack: SeedPack, reelCount: number, symbolsPerReel: number): string[][] {
  const rng = new CryptoRNG();
  const symbols = ['Wild', 'Scatter', 'A', 'K', 'Q', 'J', '10', 'Cherry', 'Lemon', 'Bell'];
  const reels: string[][] = [];
  
  for (let reel = 0; reel < reelCount; reel++) {
    const reelSymbols: string[] = [];
    for (let pos = 0; pos < symbolsPerReel; pos++) {
      const symbolSeed = {
        ...seedPack,
        nonce: seedPack.nonce + (reel * symbolsPerReel) + pos,
      };
      const symbolIndex = rng.generateInteger(symbolSeed, 0, symbols.length - 1);
      reelSymbols.push(symbols[symbolIndex]);
    }
    reels.push(reelSymbols);
  }
  
  return reels;
}

// Factory function for creating new RNG instances
export function createRNG(): CryptoRNG {
  return new CryptoRNG();
}
