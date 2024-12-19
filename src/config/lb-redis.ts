import { Redis } from "ioredis";
import LeakyBucketRedisStore from "../lib/Leaky-Bucket/cache";
let redis: Redis;
let LeakyBucketRedis: LeakyBucketRedisStore;
console.log("Connecting to Redis at:", process.env.REDIS_URL);

try {
  if (process.env.NODE_ENV === "production") {
    console.log("Connecting to Redis at:", process.env.REDIS_URL);
    redis = new Redis(process.env.REDIS_URL as string);
    LeakyBucketRedis = new LeakyBucketRedisStore({ client: redis, prefix: "lb:" });
  } else {
    console.log("Connecting to local Redis instance");
    redis = new Redis({
      host: "localhost",
      port: 6379,
    });
    LeakyBucketRedis = new LeakyBucketRedisStore({ client: redis, prefix: "lb:" });
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

export { LeakyBucketRedis, redis };