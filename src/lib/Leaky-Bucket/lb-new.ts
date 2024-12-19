import FWRedisStore from "./cache";

interface LeakyBucketWithRefill {
  user_ID: string;
  capacity: number; // Maximum tokens in the bucket
  refillRate: number; // Tokens added per second
  refillIntervalMs: number; // Refill interval in milliseconds
  API_KEY: string; // API Key for the user
  store: FWRedisStore; // Redis store instance
}

async function leakyBucket({
  user_ID,
  capacity,
  refillRate,
  refillIntervalMs,
  API_KEY,
  store,
}: LeakyBucketWithRefill): Promise<boolean> {
  try {
    const redisKey = `${API_KEY}.${user_ID}`;
    
    console.log('Leaky bucket rate limiting with refill:', { redisKey });

    // Fetch current state (remaining tokens and last refill time) from Redis
    const data = await store.get(redisKey);
    const { remainingTokens = capacity, lastRefillTime = Date.now() } = typeof data === 'object' && data !== null ? data : {};

    // Calculate how many tokens to refill based on the time passed since the last refill
    const timeElapsed = Date.now() - lastRefillTime;
    const refillTokens = Math.floor(timeElapsed / refillIntervalMs) * refillRate;

    // Refill the bucket (but don't exceed capacity)
    const newRemainingTokens = Math.min(remainingTokens + refillTokens, capacity);

    // Update the remaining tokens and last refill time in Redis
    await store.set(redisKey, {
      tokens: newRemainingTokens,
      lastRefill: Date.now(),
    });

    console.log('Refilled tokens. Remaining tokens:', newRemainingTokens);

    // Check if there are enough tokens in the bucket to allow the request
    if (newRemainingTokens <= 0) {
      console.log('Rate limit exceeded for key:', redisKey);
      return false; // Rate limit exceeded
    }

    // Allow the request and decrement the token count
    await store.set(redisKey, {
      tokens: newRemainingTokens - 1,
      lastRefill: Date.now(),
    });
    console.log('Request allowed. Remaining tokens:', newRemainingTokens - 1);

    // Set TTL to keep the state in Redis fresh, if needed
    await store.setExpiry(redisKey, Math.ceil(refillIntervalMs / 1000)); // Set TTL to the refill interval time
    console.log('Set expiry for key:', redisKey);

    return true; // Request allowed
  } catch (error) {
    console.error('Error in leakyBucketWithRefill:', error);
    // Fail-safe: accept the request on error to prevent false positives
    return true;
  }
}

export default leakyBucket;
