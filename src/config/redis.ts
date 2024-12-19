import { Redis } from "ioredis";
import RedisStore from "../lib/Fixed-Window/cache";

let redis: Redis;
let FixedWindowRedis: RedisStore;
console.log("Connecting to Redis at:", process.env.REDIS_URL);

try {
  if (process.env.NODE_ENV === "production") {
    console.log("Connecting to Redis at:", process.env.REDIS_URL);
    redis = new Redis(process.env.REDIS_URL as string);
    FixedWindowRedis = new RedisStore({ client: redis, prefix: "fw:" });
  } else {
    console.log("Connecting to local Redis instance");
    redis = new Redis({
      host: "localhost",
      port: 6379,
    });
    FixedWindowRedis = new RedisStore({ client: redis, prefix: "fw:" });
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

export { FixedWindowRedis, redis };
