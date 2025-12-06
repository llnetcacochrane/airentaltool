/**
 * Rate Limiting Utility
 *
 * Provides client-side rate limiting for sensitive operations like:
 * - Login attempts
 * - Password reset requests
 * - API calls to external services
 *
 * SECURITY NOTE: This is client-side rate limiting for UX purposes.
 * Server-side rate limiting should also be implemented for actual security.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

interface RateLimitConfig {
  maxAttempts: number;       // Maximum attempts allowed
  windowMs: number;          // Time window in milliseconds
  blockDurationMs: number;   // How long to block after exceeding limit
}

// Default configurations for different operations
export const RATE_LIMIT_CONFIGS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,      // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minute block
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,       // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
  apiCall: {
    maxAttempts: 100,
    windowMs: 60 * 1000,            // 1 minute
    blockDurationMs: 60 * 1000,     // 1 minute block
  },
  emailSend: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,       // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
} as const;

class RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: number | null = null;

  constructor() {
    // Periodically clean up expired entries
    if (typeof window !== 'undefined') {
      this.cleanupInterval = window.setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Check if an operation is rate limited
   * @param key Unique identifier for the rate limit (e.g., 'login:user@email.com')
   * @param config Rate limit configuration
   * @returns Object with isLimited flag and remaining attempts/time
   */
  check(
    key: string,
    config: RateLimitConfig
  ): {
    isLimited: boolean;
    remainingAttempts: number;
    retryAfterMs?: number;
    message?: string;
  } {
    const now = Date.now();
    const entry = this.entries.get(key);

    // No previous attempts
    if (!entry) {
      return {
        isLimited: false,
        remainingAttempts: config.maxAttempts,
      };
    }

    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const retryAfterMs = entry.blockedUntil - now;
      return {
        isLimited: true,
        remainingAttempts: 0,
        retryAfterMs,
        message: `Too many attempts. Please try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
      };
    }

    // Check if window has expired (reset counter)
    if (now - entry.firstAttempt > config.windowMs) {
      this.entries.delete(key);
      return {
        isLimited: false,
        remainingAttempts: config.maxAttempts,
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxAttempts) {
      // Block the user
      entry.blockedUntil = now + config.blockDurationMs;
      this.entries.set(key, entry);

      return {
        isLimited: true,
        remainingAttempts: 0,
        retryAfterMs: config.blockDurationMs,
        message: `Too many attempts. Please try again in ${Math.ceil(config.blockDurationMs / 60000)} minutes.`,
      };
    }

    return {
      isLimited: false,
      remainingAttempts: config.maxAttempts - entry.count,
    };
  }

  /**
   * Record an attempt for rate limiting
   * @param key Unique identifier for the rate limit
   */
  recordAttempt(key: string): void {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry) {
      this.entries.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
    } else {
      entry.count++;
      entry.lastAttempt = now;
      this.entries.set(key, entry);
    }
  }

  /**
   * Reset rate limit for a key (e.g., after successful login)
   * @param key Unique identifier for the rate limit
   */
  reset(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Clear all rate limit entries (useful for testing)
   */
  clearAll(): void {
    this.entries.clear();
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours

    for (const [key, entry] of this.entries) {
      // Remove entries older than maxAge and not currently blocked
      if (now - entry.lastAttempt > maxAge && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Helper function to check and record a rate-limited operation
 * @param operationType Type of operation (login, passwordReset, etc.)
 * @param identifier Unique identifier (email, IP, etc.)
 * @returns Result of rate limit check
 */
export function checkRateLimit(
  operationType: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string
): ReturnType<typeof rateLimiter.check> {
  const config = RATE_LIMIT_CONFIGS[operationType];
  const key = `${operationType}:${identifier}`;
  return rateLimiter.check(key, config);
}

/**
 * Record an attempt for rate limiting
 */
export function recordRateLimitAttempt(
  operationType: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string
): void {
  const key = `${operationType}:${identifier}`;
  rateLimiter.recordAttempt(key);
}

/**
 * Reset rate limit after successful operation
 */
export function resetRateLimit(
  operationType: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string
): void {
  const key = `${operationType}:${identifier}`;
  rateLimiter.reset(key);
}

/**
 * Higher-order function to wrap an async operation with rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationType: keyof typeof RATE_LIMIT_CONFIGS,
  getIdentifier: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const identifier = getIdentifier(...args);
    const check = checkRateLimit(operationType, identifier);

    if (check.isLimited) {
      throw new Error(check.message || 'Too many requests. Please try again later.');
    }

    recordRateLimitAttempt(operationType, identifier);

    try {
      const result = await fn(...args);
      // Reset on success for login-type operations
      if (operationType === 'login' || operationType === 'passwordReset') {
        resetRateLimit(operationType, identifier);
      }
      return result;
    } catch (error) {
      throw error;
    }
  };
}
