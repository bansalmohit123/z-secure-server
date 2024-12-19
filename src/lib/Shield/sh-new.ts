// rate limiting function using shield algorithm with shield increment
// input : user_ID, limit, windowMs, API_KEY.

// output : rate limit exceeded or not.

// single redis store will handle all the users using our rate limiting service for their servers.

// fetch from redis : RedisStore.API_KEY.user_ID = {currentWindowHits, previousWindowHits, resetTime}
// calculate effectiveCount using overlap between windows.

// if effectiveCount > limit, return rate limit exceeded.
// else increment currentWindowHits and return rate limit not exceeded.

import ShieldRedisStore from "./cache";

interface ShieldWindow {
  user_ID: string;
  limit: number;
  windowMs: number;
  API_KEY: string;
  store: ShieldRedisStore;
}

async function shieldWindow({ user_ID, limit, windowMs, API_KEY, store }: ShieldWindow): Promise<boolean> {
//   try {
//     const currentTimestamp = Date.now();
//     const redisKey = `${API_KEY}.${user_ID}`;
//     const currentWindowStart = Math.floor(currentTimestamp / windowMs) * windowMs;
//     const previousWindowStart = currentWindowStart - windowMs;

//     console.log("Shield algorithm rate limiting with shield increment:", { redisKey });

//     // Perform shield increment logic
//     const currentKey = `${redisKey}:current`;
//     const previousKey = `${redisKey}:previous`;
//     const ttl = windowMs; // TTL for each key in milliseconds

//     // Start a pipeline to atomically increment and fetch
//     const pipeline = store.client.pipeline();
//     pipeline.incr(currentKey);
//     pipeline.pexpire(currentKey, ttl);
//     pipeline.get(previousKey);
//     const [currentHitsRaw, , previousHitsRaw] = await pipeline.exec();

//     // Parse results
//     const currentHits = parseInt(currentHitsRaw[1] as string, 10);
//     const previousHits = previousHitsRaw[1] ? parseInt(previousHitsRaw[1] as string, 10) : 0;

//     // Calculate overlap factor
//     const overlapFactor = 1 - (currentTimestamp - currentWindowStart) / windowMs;

//     // Calculate effective count
//     const effectiveCount = currentHits + previousHits * overlapFactor;
//     console.log("Effective count:", effectiveCount);

//     // Decision based on limit
//     if (effectiveCount > limit) {
//       console.log("Rate limit exceeded for key:", redisKey);
//       return false; // Rate limit exceeded
//     }

//     // Update previous key only when moving to the next window
//     if (currentTimestamp >= currentWindowStart + windowMs) {
//       await store.client.set(previousKey, currentHits.toString(), "PX", 2 * ttl); // Set expiry for previous key
//       console.log("Updated previous window key:", previousKey);
//     }

//     console.log("Rate limit not exceeded for key:", redisKey);
//     return true; // Rate limit not exceeded
//   } catch (error) {
//     console.error("Error in shieldWindow with shield increment:", error);
//     // Fail-safe: accept the request on error to prevent false positives
//     return true;
//   }
const key = `${API_KEY}.${user_ID}`;
try {
  const effectiveCount = await store.shieldIncrement(key, windowMs);
  console.log("Effective Count:", effectiveCount);

  if (effectiveCount > limit) {
    console.log("Rate limit exceeded for key:", key);
    return false; // Rate limit exceeded
  }
  return true; // Rate limit not exceeded
} catch (error) {
  console.error("Error in shieldRateLimiter:", error);
  return true; // Fail-safe: Allow request on error
}
}

export default shieldWindow;
