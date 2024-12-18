import RedisStore from "./cache";

interface TokenBucket {
  user_ID: string;
  limit: number; // Maximum capacity of tokens in the bucket
  refillRate: number; // Number of tokens added per second
  API_KEY: string;
  store: RedisStore;
}

async function tokenBucket({ user_ID, limit, refillRate, API_KEY, store }: TokenBucket): Promise<boolean> {
  try {
    const redisKey = `${API_KEY}.${user_ID}`;
    const now = Date.now();

    // Get the current state of the bucket
    const currentTokens = (await store.get(redisKey)) || limit; // Initialize with full bucket if not found
    const lastRefillTimeKey = `${redisKey}:lastRefill`;
    const lastRefillTime = (await store.get(lastRefillTimeKey)) || now;

    // Calculate elapsed time since the last refill
    const elapsedMs = now - lastRefillTime;
    const newTokens = Math.min(limit, currentTokens + Math.floor((elapsedMs / 1000) * refillRate));

    if (newTokens <= 0) {
      // If no tokens are available, reject the request
      return false;
    }

    // Deduct one token for the current request
    const remainingTokens = newTokens - 1;

    // Update the bucket state in Redis
    await store.set(redisKey, remainingTokens);
    await store.set(lastRefillTimeKey, now);

    return true; // Request allowed
  } catch (error) {
    console.error('Error in tokenBucket:', error);
    // Fail-safe: accept the request on error to prevent false positives
    return true;
  }
}

export default tokenBucket;