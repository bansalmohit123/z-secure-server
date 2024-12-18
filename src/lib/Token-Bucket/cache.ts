import Redis, { Redis as RedisClient } from 'ioredis';

interface RedisStoreOptions {
  client: RedisClient;
  prefix?: string;
}

type Store = {
  get: (key: string) => Promise<number | null>;
  set: (key: string, tokens: number, ttlMs?: number) => Promise<void>;
  update: (key: string, tokens: number) => Promise<number>;
  delete: (key: string) => Promise<void>;
  resetAll: () => Promise<void>;
  shutdown: () => Promise<void>;
};

export default class RedisTokenBucketStore implements Store {
  public client: RedisClient;
  public prefix: string;

  constructor(options: RedisStoreOptions) {
    this.client = options.client;
    this.prefix = options.prefix ?? 'tb:'; // Default prefix
  }

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<number | null> {
    const redisKey = this.prefixKey(key);
    const tokens = await this.client.get(redisKey);
    return tokens ? parseInt(tokens, 10) : null;
  }

  async set(key: string, tokens: number, ttlMs?: number): Promise<void> {
    const redisKey = this.prefixKey(key);
    if (ttlMs) {
      await this.client.set(redisKey, tokens.toString(), 'PX', ttlMs);
    } else {
      await this.client.set(redisKey, tokens.toString());
    }
  }

  async update(key: string, tokens: number): Promise<number> {
    const redisKey = this.prefixKey(key);
    const newTokenCount = await this.client.incrby(redisKey, tokens);
    return newTokenCount;
  }

  async delete(key: string): Promise<void> {
    const redisKey = this.prefixKey(key);
    await this.client.del(redisKey);
  }

  async resetAll(): Promise<void> {
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async shutdown(): Promise<void> {
    await this.client.quit();
  }
}


 
