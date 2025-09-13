import { NextRequest } from 'next/server';

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: NextRequest) => string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}

export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyGenerator } = config;
  
  return function check(request: NextRequest): RateLimitResult {
    const key = keyGenerator ? keyGenerator(request) : getClientIP(request);
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // New entry or expired entry
      rateLimitStore.set(key, { count: 1, resetTime });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: new Date(resetTime),
      };
    }
    
    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: new Date(entry.resetTime),
      };
    }
    
    // Increment count
    entry.count += 1;
    rateLimitStore.set(key, entry);
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: new Date(entry.resetTime),
    };
  };
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const contactRateLimit = rateLimit({
  maxRequests: 3,
  windowMs: 10 * 60 * 1000, // 10 minutes
});

export const apiRateLimit = rateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const uploadRateLimit = rateLimit({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

export const casinoRateLimit = rateLimit({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute for casino bets
});
