import { Redis } from "ioredis";
import FWRedisStore from "../lib/Fixed-Window/cache";
let redis: Redis;
let FixedWindowRedis: FWRedisStore;
console.log("Connecting to Redis at:", process.env.REDIS_URL);

try {
  if (process.env.NODE_ENV === "production") {
    console.log("Connecting to Redis at:", process.env.REDIS_URL);
    redis = new Redis(process.env.REDIS_URL as string);
  } else {
    console.log("Connecting to local Redis instance");
    redis = new Redis({
      host: "localhost",
      port: 6379,
    });
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

export {redis };
