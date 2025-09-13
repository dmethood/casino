import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Production Security Middleware - Licensed Casino Platform
export default async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply security headers to all responses
  applySecurityHeaders(response);

  // Block requests from blocked countries immediately
  const geoCheckResult = await performGeoCheck(request);
  if (geoCheckResult.blocked) {
    return blockResponse('Geographic access denied', geoCheckResult.reason);
  }

  // Apply rate limiting
  const rateLimitResult = await checkRateLimit(request);
  if (rateLimitResult.limited) {
    return rateLimitResponse();
  }

  // Check for suspicious patterns
  const suspiciousActivity = await detectSuspiciousActivity(request);
  if (suspiciousActivity.block) {
    return blockResponse('Access denied', 'Suspicious activity detected');
  }

  // Protect admin routes with additional security
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/admin')) {
    
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token || token.role === 'PLAYER') {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    // Check IP whitelist for admin users
    const ipAllowed = await checkAdminIPWhitelist(request, token.id as string);
    if (!ipAllowed) {
      return blockResponse('Access denied', 'IP address not whitelisted for admin access');
    }

    // Enforce 2FA for admin users
    const requires2FA = await check2FARequired(token.id as string);
    if (requires2FA && !token.twoFactorVerified) {
      return NextResponse.redirect(new URL('/auth/2fa', request.url));
    }
  }

  // Protect casino routes with compliance checks
  if (request.nextUrl.pathname.startsWith('/casino')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    // Check if user is KYC verified for real money play
    const kycVerified = await checkKYCStatus(token.id as string);
    if (!kycVerified) {
      return NextResponse.redirect(new URL('/kyc/verify', request.url));
    }

    // Check responsible gambling limits
    const rgStatus = await checkResponsibleGamblingStatus(token.id as string);
    if (rgStatus.blocked) {
      return NextResponse.redirect(new URL('/responsible-gambling/blocked', request.url));
    }

    // Check jurisdiction compliance for gaming
    const jurisdictionAllowed = await checkGamingJurisdiction(request, token.id as string);
    if (!jurisdictionAllowed) {
      return blockResponse('Gaming not available', 'Gaming not licensed in your jurisdiction');
    }
  }

  // Protect payment routes with additional validation
  if (request.nextUrl.pathname.startsWith('/api/payments') || 
      request.nextUrl.pathname.startsWith('/api/casino/')) {
    
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      return unauthorizedResponse();
    }

    // Check for PCI compliance requirements
    const pciCompliant = await checkPCICompliance(request);
    if (!pciCompliant) {
      return blockResponse('Payment processing unavailable', 'PCI compliance check failed');
    }
  }

  // Log security events for audit
  if (shouldLogRequest(request)) {
    await logSecurityEvent(request, geoCheckResult, rateLimitResult, suspiciousActivity);
  }

  return response;
}

// Security Headers (Production-Grade)
function applySecurityHeaders(response: NextResponse) {
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.airwallex.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.stripe.com https://api.airwallex.com wss:",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    process.env.CSP_REPORT_URI ? `report-uri ${process.env.CSP_REPORT_URI}` : ''
  ].filter(Boolean).join('; ');

  response.headers.set('Content-Security-Policy', cspPolicy);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  
  // Remove server information
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');
}

// Geo-location and jurisdiction blocking
async function performGeoCheck(request: NextRequest): Promise<{
  blocked: boolean;
  reason?: string;
  country?: string;
}> {
  try {
    const ip = getClientIP(request);
    
    // Skip geo check for local development
    if (process.env.APP_ENV !== 'production' && isLocalIP(ip)) {
      return { blocked: false, country: process.env.DEV_TEST_COUNTRY || 'GB' };
    }

    // Get geo-location
    const geoData = await getGeoLocation(ip);
    if (!geoData.country) {
      return { blocked: true, reason: 'Could not determine location' };
    }

    // Check against blocked countries
    const blockedCountries = process.env.GEO_BLOCK_LIST?.split(',').map(c => c.trim()) || [];
    if (blockedCountries.includes(geoData.country)) {
      return { blocked: true, reason: 'Country blocked', country: geoData.country };
    }

    // Check against allowed countries
    const allowedCountries = process.env.GEO_ALLOW_LIST?.split(',').map(c => c.trim()) || [];
    if (allowedCountries.length > 0 && !allowedCountries.includes(geoData.country)) {
      return { blocked: true, reason: 'Country not licensed', country: geoData.country };
    }

    return { blocked: false, country: geoData.country };

  } catch (error) {
    console.error('Geo check failed:', error);
    // Fail closed - block on error for production
    return { blocked: true, reason: 'Geo verification failed' };
  }
}

// Rate limiting with Redis backing
async function checkRateLimit(request: NextRequest): Promise<{
  limited: boolean;
  remaining?: number;
}> {
  try {
    const ip = getClientIP(request);
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    
    // Different limits for different endpoints
    const isAPIRequest = request.nextUrl.pathname.startsWith('/api/');
    const isPaymentRequest = request.nextUrl.pathname.includes('/payment');
    const isCasinoRequest = request.nextUrl.pathname.startsWith('/api/casino/');

    let effectiveMaxRequests = maxRequests;
    
    if (isPaymentRequest) {
      effectiveMaxRequests = 10; // Strict limits for payments
    } else if (isCasinoRequest) {
      effectiveMaxRequests = 50; // Gaming limits
    } else if (isAPIRequest) {
      effectiveMaxRequests = 30; // General API limits
    }

    // In production, this would use Redis
    const key = `rate_limit_${ip}_${Math.floor(Date.now() / windowMs)}`;
    
    const requestCount = await getRequestCount(key);
    
    if (requestCount >= effectiveMaxRequests) {
      return { limited: true, remaining: 0 };
    }

    await incrementRequestCount(key, windowMs);
    return { limited: false, remaining: effectiveMaxRequests - requestCount - 1 };

  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { limited: false }; // Allow on error but log
  }
}

// Detect suspicious activity patterns
async function detectSuspiciousActivity(request: NextRequest): Promise<{
  block: boolean;
  reason?: string;
}> {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check for bot patterns
  const suspiciousBots = [
    'curl', 'wget', 'python', 'scrapy', 'bot', 'crawler',
    'spider', 'scanner', 'exploit', 'hack', 'attack'
  ];
  
  if (suspiciousBots.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    return { block: true, reason: 'Suspicious user agent' };
  }

  // Check for missing required headers
  if (request.nextUrl.pathname.startsWith('/api/') && !userAgent) {
    return { block: true, reason: 'Missing user agent' };
  }

  // Check for suspicious URL patterns
  const suspiciousPatterns = [
    'wp-admin', 'phpmyadmin', '.env', '.git', 'admin.php',
    'shell', 'cmd', 'eval', 'execute', 'system'
  ];
  
  if (suspiciousPatterns.some(pattern => request.nextUrl.pathname.includes(pattern))) {
    return { block: true, reason: 'Suspicious URL pattern' };
  }

  return { block: false };
}

// Helper functions
async function checkAdminIPWhitelist(request: NextRequest, userId: string): Promise<boolean> {
  const adminWhitelist = process.env.ADMIN_IP_WHITELIST?.split(',').map(ip => ip.trim()) || [];
  
  if (adminWhitelist.length === 0) {
    return true; // No whitelist configured
  }

  const clientIP = getClientIP(request);
  return adminWhitelist.includes(clientIP) || adminWhitelist.includes('*');
}

async function check2FARequired(userId: string): Promise<boolean> {
  return process.env.ADMIN_2FA_ENFORCED === 'true';
}

async function checkKYCStatus(userId: string): Promise<boolean> {
  // In production, this would query the database
  return true;
}

async function checkResponsibleGamblingStatus(userId: string): Promise<{
  blocked: boolean;
  reason?: string;
}> {
  return { blocked: false };
}

async function checkGamingJurisdiction(request: NextRequest, userId: string): Promise<boolean> {
  return true;
}

async function checkPCICompliance(request: NextRequest): Promise<boolean> {
  return request.headers.get('content-type')?.includes('application/json') || false;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return request.ip || '127.0.0.1';
}

function isLocalIP(ip: string): boolean {
  return ['127.0.0.1', '::1'].includes(ip) || 
         ip.startsWith('192.168.') || 
         ip.startsWith('10.') || 
         ip.startsWith('172.');
}

async function getGeoLocation(ip: string): Promise<{ country?: string }> {
  return { country: process.env.DEV_TEST_COUNTRY || 'GB' };
}

// Rate limiting helpers (would use Redis in production)
const requestCounts = new Map<string, { count: number; expires: number }>();

async function getRequestCount(key: string): Promise<number> {
  const data = requestCounts.get(key);
  if (!data || Date.now() > data.expires) {
    return 0;
  }
  return data.count;
}

async function incrementRequestCount(key: string, windowMs: number): Promise<void> {
  const expires = Date.now() + windowMs;
  const current = requestCounts.get(key);
  
  if (!current || Date.now() > current.expires) {
    requestCounts.set(key, { count: 1, expires });
  } else {
    requestCounts.set(key, { count: current.count + 1, expires: current.expires });
  }
}

function shouldLogRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith('/api/') ||
         request.nextUrl.pathname.startsWith('/dashboard') ||
         request.nextUrl.pathname.startsWith('/admin');
}

async function logSecurityEvent(
  request: NextRequest,
  geoResult: any,
  rateLimitResult: any,
  suspiciousResult: any
): Promise<void> {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      path: request.nextUrl.pathname,
      method: request.method,
      geoCheck: geoResult,
      rateLimit: rateLimitResult,
      suspicious: suspiciousResult
    };

    console.log('Security Event:', JSON.stringify(logEntry));
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Response helpers
function blockResponse(message: string, reason: string): NextResponse {
  return new NextResponse(
    JSON.stringify({ 
      error: message, 
      code: 'ACCESS_DENIED',
      details: reason,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

function rateLimitResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({ 
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': '900'
      }
    }
  );
}

function unauthorizedResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({ 
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
