import { redisRateLimit } from "./redis";
import { rateLimit } from "./redisKeys";

/**
 * Increment rate limit counter for a given key
 * @param key - The identifier for rate limiting (e.g., IP address, user ID)
 * @param windowSeconds - The time window in seconds
 * @returns The current count after increment
 */
export async function incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
  try {
    const redisKey = rateLimit(key);
    const count = await redisRateLimit.incr(redisKey);

    // Set expiration on first increment (when count is 1)
    if (count === 1) {
      await redisRateLimit.expire(redisKey, windowSeconds);
    }

    return count;
  } catch (error) {
    console.error(
      "[RateLimit] Redis error — failing closed to protect against unbounded requests:",
      error
    );
    // Fail closed: return a value that will always exceed any limit so requests
    // are blocked when Redis is unavailable rather than allowed through.
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Seconds left in the current window for a rate-limit key.
 *
 * Only meaningful right after `checkRateLimit` has refused an action — it reads
 * the TTL Redis set on the counter's first increment, which is when the caller
 * may try again. Returns 0 when the key has no TTL or Redis is unreachable, so
 * callers fall back to a message without a countdown rather than a wrong one.
 */
export async function rateLimitRetryAfter(key: string): Promise<number> {
  try {
    const ttl = await redisRateLimit.ttl(rateLimit(key));
    return ttl > 0 ? ttl : 0;
  } catch (error) {
    console.error("[RateLimit] Redis error reading retry window:", error);
    return 0;
  }
}

/**
 * Check if a request should be rate limited
 * @param key - The identifier for rate limiting (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - The time window in seconds
 * @returns true if rate limit is exceeded, false otherwise
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const count = await incrementRateLimit(key, windowSeconds);
    return count > limit;
  } catch (error) {
    console.error("[RateLimit] Redis error — failing closed:", error);
    return true;
  }
}
