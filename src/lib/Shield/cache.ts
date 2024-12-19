import Redis, { Redis as RedisClient } from 'ioredis';

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
    shieldIncrement: (key: string, windowMs: number) => Promise<number>;
};

export default class ShieldRedisStore {
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
            await this.client.pexpire(redisKey, ttlMs);
        } catch (error) {
            console.error(`Error setting expiry for key ${redisKey}:`, error);
            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        const redisKey = this.prefixKey(key);
        try {
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
                await this.client.del(...keys);
            }
        } catch (error) {
            console.error('Error resetting all keys:', error);
            throw error;
        }
    }

    async shutdown(): Promise<void> {
        try {
            await this.client.quit();
        } catch (error) {
            console.error('Error shutting down Redis client:', error);
            throw error;
        }
    }

    /**
     * Shield Algorithm: Increment with overlapping windows
     */
    async shieldIncrement(key: string, windowMs: number): Promise<number> {
        const currentKey = this.prefixKey(`${key}:current`);
        const previousKey = this.prefixKey(`${key}:previous`);
        const currentTimestamp = Date.now();

        try {
            const currentWindowStart = Math.floor(currentTimestamp / windowMs) * windowMs;
            const previousWindowStart = currentWindowStart - windowMs;

            const currentCount = await this.client.incr(currentKey);
            await this.client.pexpire(currentKey, windowMs);

            const previousCountRaw = await this.client.get(previousKey);
            const previousCount = previousCountRaw ? parseInt(previousCountRaw, 10) : 0;

            const overlapFactor = 1 - (currentTimestamp - currentWindowStart) / windowMs;
            const effectiveCount = currentCount + previousCount * overlapFactor;

            await this.client.set(previousKey, currentCount.toString(), 'PX', 2 * windowMs);

            return Math.ceil(effectiveCount);
        } catch (error) {
            console.error('Error in shieldIncrement:', error);
            throw error;
        }
    }
}

