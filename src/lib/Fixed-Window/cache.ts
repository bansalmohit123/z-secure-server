import scripts from '../fixed-window/scripts';
import { Store } from '../types';
import Redis, { Redis as RedisClient } from 'ioredis';

interface RedisStoreOptions {
  client: RedisClient;
  prefix?: string;
}

export default class RedisStore implements Store {
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
    const totalHits = await this.client.get(redisKey);
    return totalHits ? parseInt(totalHits, 10) : null;
  }

  async increment(key: string): Promise<number> {
    const redisKey = this.prefixKey(key);
    const totalHits = await this.client.incr(redisKey);
    return totalHits;
  }

  async setExpiry(key: string, ttlMs: number): Promise<void> {
    const redisKey = this.prefixKey(key);
    await this.client.pexpire(redisKey, ttlMs);
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
