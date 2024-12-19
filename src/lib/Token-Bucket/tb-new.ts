import RedisStore from "./cache";

interface TokenBucket {
  user_ID: string;
  capacity: number; // Maximum capacity of tokens in the bucket
  refillRate: number; // Number of tokens added per second
  API_KEY: string;
  store: RedisStore;
  identificationKey: string;
}

async function tokenBucket({
  user_ID,
  capacity,
  refillRate,
  API_KEY,
  store,
  identificationKey,
}: TokenBucket): Promise<boolean> {
  try {
    const redisKey = `${API_KEY}.${identificationKey}.${user_ID}`;
    const lastRefillTimeKey = `${redisKey}.lastRefill`;
    const now = Date.now();

    // Fetch the current state of the bucket
    const currentTokensStr = await store.get(redisKey);
    const lastRefillTimeStr = await store.get(lastRefillTimeKey);

    // Initialize bucket values if not found in Redis
   // Safely parse current tokens and last refill time
const currentTokens = currentTokensStr !== null && currentTokensStr !== undefined 
? currentTokensStr
: capacity;

const lastRefillTime = lastRefillTimeStr !== null && lastRefillTimeStr !== undefined 
? lastRefillTimeStr
: now;

    console.log("Current tokens:", currentTokens);
    console.log("Last refill time:", lastRefillTime);

    // Calculate elapsed time and refill tokens
    const elapsedMs = now - lastRefillTime;
    const refillTokens = Math.floor((elapsedMs / 1000) * refillRate);
    const newTokens = Math.min(capacity, currentTokens + refillTokens);

    console.log(
      `Elapsed time (ms): ${elapsedMs}, Refill tokens: ${refillTokens}, New tokens: ${newTokens}`
    );

    // If there are no tokens available, reject the request
    if (newTokens < 1) {
      console.log("Request rejected: No tokens available.");
      return false;
    }

    // Deduct one token for the current request
    const remainingTokens = newTokens - 1;

    // Update Redis with the new token count and last refill time
    await store.set(redisKey, remainingTokens);
    await store.set(lastRefillTimeKey, now);

    console.log(
      `Request allowed: Remaining tokens: ${remainingTokens}, Last refill updated.`
    );

    return true; // Request allowed
  } catch (error) {
    console.error("Error in tokenBucket:", error.message);
    // Fail-safe: accept the request on error to prevent false positives
    return true;
  }
}

export default tokenBucket;
