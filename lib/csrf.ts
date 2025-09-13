import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';
const TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';

export function generateCSRFToken(): string {
  const token = randomBytes(TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', SECRET)
    .update(token + timestamp)
    .digest('hex');
  
  return `${token}.${timestamp}.${signature}`;
}

export function validateCSRFToken(token: string): boolean {
  if (!token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  const [tokenPart, timestampPart, signaturePart] = parts;
  
  // Check if token is not older than 1 hour
  const timestamp = parseInt(timestampPart, 10);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  if (now - timestamp > oneHour) return false;
  
  // Verify signature
  const expectedSignature = createHmac('sha256', SECRET)
    .update(tokenPart + timestampPart)
    .digest('hex');
  
  try {
    const signatureBuffer = Buffer.from(signaturePart, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    return signatureBuffer.length === expectedBuffer.length && 
           timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function verifyCSRF(request: NextRequest): boolean {
  const token = request.headers.get(CSRF_HEADER);
  return validateCSRFToken(token || '');
}

export const CSRF_TOKEN_HEADER = CSRF_HEADER;
