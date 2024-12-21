import LeakyBucketRedisStore from "./cache";

interface LeakyBucketWithRefill {
  user_ID: string;
  capacity: number; // Maximum tokens in the bucket
  refillRate: number; // Tokens added per second
  refillIntervalMs: number; // Refill interval in milliseconds
  API_KEY: string; // API Key for the user
  identificationKey: string; // Identification key for the user
  store: LeakyBucketRedisStore; // Redis store instance
}

async function leakyBucket({
  user_ID,
  capacity,
  refillRate,
  refillIntervalMs,
  API_KEY,
  identificationKey,
  store,
}: LeakyBucketWithRefill): Promise<boolean> {
  try {
    
    //console.log('Leaky bucket rate limiting with refill:', { API_KEY, capacity, refillRate, refillIntervalMs, user_ID, identificationKey });

    const redisKey = `${API_KEY}.${identificationKey}.${user_ID}`;
    
    // console.log('Leaky bucket rate limiting with refill:', { redisKey });

    // Fetch current state (remaining tokens and last refill time) from Redis
    const data = await store.get(redisKey);
    console.log('Fetched data from Redis:', data);
    if (data == null) {
      // Initialize the bucket in Redis with full capacity
      await store.set(redisKey, {
          tokens: capacity,
          lastRefill: Date.now(),
      });
      console.log('Bucket initialized with full capacity:', capacity);
  
      // Allow the request as this is the first time the bucket is used
      await store.set(redisKey, {
          tokens: capacity - 1,
          lastRefill: Date.now(),
      });
      console.log('Request allowed. Remaining tokens:', capacity - 1);
  
      return true; // Request allowed
  } else {
      // Extract tokens and last refill time
      const remainingTokens = Number.isNaN(data.tokens) ? capacity : data.tokens;
      const lastRefillTime = data.lastRefill ?? Date.now();
  
      // Calculate time elapsed since the last refill
      const timeElapsed = Date.now() - lastRefillTime;
  
      // Calculate how many tokens to refill based on the time passed
      const refillTokens = Math.floor(timeElapsed / refillIntervalMs) * refillRate;
  
      // Refill the bucket without exceeding capacity
      const newRemainingTokens = Math.min(remainingTokens + refillTokens, capacity);
  
      // Update the bucket in Redis with the latest token count and refill time
      await store.set(redisKey, {
          tokens: newRemainingTokens,
          lastRefill: Date.now(),
      });
  
      console.log('Refilled tokens. Remaining tokens:', newRemainingTokens);
  
      // Check if there are enough tokens to allow the request
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
  
      return true; // Request allowed
  }
  
   
  } catch (error) {
    console.error('Error in leakyBucketWithRefill:', error);
    // Fail-safe: accept the request on error to prevent false positives
    return true;
  }
}

export default leakyBucket;