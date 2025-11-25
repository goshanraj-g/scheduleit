// Simple in-memory rate limiter
// For production, consider using Redis or Upstash

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds
}

/**
 * Check if an action is rate limited
 * @param key - Unique identifier (e.g., IP address or fingerprint)
 * @param limit - Max requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 3600000 // 1 hour default
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // No existing entry or expired
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }

  // Within window
  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Generate a browser fingerprint for client-side rate limiting
 * This is stored in localStorage and used as a fallback when IP isn't available
 */
export function getClientFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  let fingerprint = localStorage.getItem('whenworks_fingerprint');
  if (!fingerprint) {
    fingerprint = `client_${crypto.randomUUID()}`;
    localStorage.setItem('whenworks_fingerprint', fingerprint);
  }
  return fingerprint;
}

/**
 * Get or create a session token for availability ownership
 * This token is used to verify that only the original submitter can update their availability
 */
export function getSessionToken(eventId: string): string {
  if (typeof window === 'undefined') return '';
  
  const key = `whenworks_session_${eventId}`;
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(key, token);
  }
  return token;
}
