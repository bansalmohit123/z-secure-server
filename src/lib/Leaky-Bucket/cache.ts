import Redis, { Redis as RedisClient } from 'ioredis';

interface RedisStoreOptions {
  client: RedisClient;
  prefix?: string;
}

interface LeakyBucketOptions {
  user_ID: string;
  capacity: number; // Maximum tokens in the bucket
  refillRate: number; // Tokens added per refill interval
  refillIntervalMs: number; // Refill interval in milliseconds
}

type Store = {
  get: (key: string) => Promise<number | null>;
  set: (key: string, data: { tokens: number; lastRefill: number }) => Promise<void>;
  increment: (key: string) => Promise<number>;
  setExpiry: (key: string, ttlMs: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  resetAll: () => Promise<void>;
  shutdown: () => Promise<void>;
  leakyBucket: (options: LeakyBucketOptions) => Promise<boolean>;
};

export default class LeakyBucketRedisStore implements Store {
  public client: RedisClient;
  public prefix: string;

  constructor(options: RedisStoreOptions) {
    this.client = options.client;
    this.prefix = options.prefix ?? 'rl:';
  }

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<number | null> {
    const redisKey = this.prefixKey(key);
    try {
      console.log('Fetching key:', redisKey);
      const totalHits = await this.client.get(redisKey);
      return totalHits ? parseInt(totalHits, 10) : null;
    } catch (error) {
      console.error(`Error fetching key ${redisKey}:`, error);
      throw error;
    }
  }

  async set(key: string, data: { tokens: number; lastRefill: number }): Promise<void> {
    const redisKey = this.prefixKey(key);
    try {
      console.log('Setting key:', redisKey, 'with data:', data);
      await this.client.hmset(redisKey, {
        tokens: data.tokens.toString(),
        lastRefill: data.lastRefill.toString(),
      });
    } catch (error) {
      console.error(`Error setting key ${redisKey}:`, error);
      throw error;
    }
  }

  async increment(key: string): Promise<number> {
    const redisKey = this.prefixKey(key);
    try {
      console.log('Incrementing key:', redisKey);
      const totalHits = await this.client.incr(redisKey);
      return totalHits;
    } catch (error) {
      console.error(`Error incrementing key ${redisKey}:`, error);
      throw error;
    }
  }

  async setExpiry(key: string, ttlMs: number): Promise<void> {
    const redisKey = this.prefixKey(key);
    try {
      console.log('Setting expiry for key:', redisKey, 'with TTL:', ttlMs);
      await this.client.pexpire(redisKey, ttlMs);
    } catch (error) {
      console.error(`Error setting expiry for key ${redisKey}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const redisKey = this.prefixKey(key);
    try {
      console.log('Deleting key:', redisKey);
      await this.client.del(redisKey);
    } catch (error) {
      console.error(`Error deleting key ${redisKey}:`, error);
      throw error;
    }
  }

  async resetAll(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        console.log('Resetting all keys with prefix:', this.prefix);
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Error resetting all keys:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down Redis client');
      await this.client.quit();
    } catch (error) {
      console.error('Error shutting down Redis client:', error);
      throw error;
    }
  }

  /**
   * Leaky Bucket Algorithm
   */
  async leakyBucket({
    user_ID,
    capacity,
    refillRate,
    refillIntervalMs,
  }: LeakyBucketOptions): Promise<boolean> {
    const redisKey = this.prefixKey(user_ID);
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local refillIntervalMs = tonumber(ARGV[3])
      local currentTimeMs = tonumber(ARGV[4])

      local bucket = redis.call("HMGET", key, "tokens", "lastRefill")
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or currentTimeMs

      -- Calculate new tokens after refill
      local elapsedTime = currentTimeMs - lastRefill
      local newTokens = math.min(capacity, tokens + (elapsedTime * refillRate / refillIntervalMs))

      -- If not enough tokens, reject the request
      if newTokens < 1 then
        return 0
      end

      -- Update tokens and lastRefill time
      redis.call("HMSET", key, "tokens", newTokens - 1, "lastRefill", currentTimeMs)
      redis.call("PEXPIRE", key, math.ceil(refillIntervalMs * 2)) -- Set TTL

      return 1
    `;

    try {
      const currentTimeMs = Date.now();
      const result = await this.client.eval(luaScript, 1, redisKey, capacity, refillRate, refillIntervalMs, currentTimeMs);
      return result === 1; // Return true if request is allowed, false otherwise
    } catch (error) {
      console.error('Error in leakyBucket:', error);
      throw error;
    }
  }
}
