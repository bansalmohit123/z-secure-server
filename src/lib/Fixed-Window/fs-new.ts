// rate limiting function in fixed window
// input : user_ID, limit, windowMs, API_KEY.

// output : rate limit exceeded or not.

//single redis store will handle all the users using our rate limiting servie for their servers.

// fetch from redis : RedisStore.API_KEY.user_ID  = {totalHits, resetTime}
// use redis ttl to automatically reset the counter after windowMs.

// if totalHits > limit, return rate limit exceeded.
// else increment totalHits and return rate limit not exceeded.

import RedisStore from "./cache";

interface FixedWindow {
  user_ID: string;
  limit: number;
  windowMs: number;
  API_KEY: string;
  store : RedisStore;
}

async function fixedWindow({ user_ID, limit, windowMs, API_KEY, store }: FixedWindow): Promise<boolean> {
  try {
    const redisKey = `${API_KEY}.${user_ID}`;
    const ttl = Math.ceil(windowMs); // TTL in seconds

    console.log('Fixed window rate limiting:', { redisKey, ttl });
    const beforeHits = await store.get(redisKey);
    console.log('Before hits:', beforeHits);

    // Increment the counter atomically and get the new value
    const currentHits = await store.increment(redisKey);
    console.log('Current hits:', currentHits);

    if (currentHits === 1) {
      // Set expiration only when key is first created
      await store.setExpiry(redisKey, ttl);
      console.log('Set expiry for key:', redisKey, 'with TTL:', ttl);
    }

    if (currentHits > limit) {
      console.log('Rate limit exceeded for key:', redisKey);
      return false; // Rate limit exceeded
    }

    console.log('Rate limit not exceeded for key:', redisKey);
    return true; // Rate limit not exceeded
  } catch (error) {
    console.error('Error in fixedWindow:', error);
    // Fail-safe: accept the request on error to prevent false positives
    return true;
  }
}

export default fixedWindow;
