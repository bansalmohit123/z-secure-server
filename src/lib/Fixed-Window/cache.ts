// import scripts from '../fixed-window/scripts';
import Redis, { Redis as RedisClient } from 'ioredis';
import { redis } from '../../config/redis';

interface RedisStoreOptions {
  client: RedisClient;
  prefix?: string;
}

type Store = {
    get: (key: string) => Promise<number | null>;
    increment: (key: string) => Promise<number>;
    setExpiry: (key: string, ttlMs: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
    resetAll: () => Promise<void>;
    shutdown: () => Promise<void>;
    };

    export default class FWRedisStore implements Store {
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
      }
      