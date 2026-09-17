// Sliding-window in-memory rate limiter for authentication endpoints

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale records every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < 300000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

/**
 * Check if an identifier is within the rate limit.
 * @param key Unique key (e.g. IP, handle, or action name)
 * @param maxRequests Maximum allowed requests in window
 * @param windowMs Window duration in milliseconds
 * @returns { allowed: boolean, retryAfterSeconds?: number }
 */
export function checkRateLimit(key: string, maxRequests: number = 5, windowMs: number = 60000): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps outside window
  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  record.timestamps.push(now);
  return { allowed: true };
}
