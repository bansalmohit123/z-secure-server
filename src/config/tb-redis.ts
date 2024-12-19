import { Redis } from "ioredis";
import RedisTokenBucketStore from "../lib/Token-Bucket/cache";
let redis: Redis;
let TokenBucketRedis: RedisTokenBucketStore;
console.log("Connecting to Redis at:", process.env.REDIS_URL);

try {
  if (process.env.NODE_ENV === "production") {
    console.log("Connecting to Redis at:", process.env.REDIS_URL);
    redis = new Redis(process.env.REDIS_URL as string);
    TokenBucketRedis = new RedisTokenBucketStore({ client: redis, prefix: "tb:" });
  } else {
    console.log("Connecting to local Redis instance");
    redis = new Redis({
      host: "localhost",
      port: 6379,
    });
    TokenBucketRedis = new RedisTokenBucketStore({ client: redis, prefix: "tb:" });
  }

  redis.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  redis.on("connect", () => {
    console.log("Redis connected successfully");
  });

} catch (error) {
  console.error("Failed to initialize Redis:", error);
}

export { TokenBucketRedis, redis };