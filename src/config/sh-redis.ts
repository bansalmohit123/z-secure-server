import { Redis } from "ioredis";
import shieldWindow from "../lib/Shield/cache";

let redis: Redis;
let ShieldRedis: shieldWindow;
console.log("Connecting to Redis at:", process.env.REDIS_URL);

try {
  if (process.env.NODE_ENV === "production") {
    console.log("Connecting to Redis at:", process.env.REDIS_URL);
    redis = new Redis(process.env.REDIS_URL as string);
    ShieldRedis = new shieldWindow({ client: redis, prefix: "sh:" });
  } else {
    console.log("Connecting to local Redis instance");
    redis = new Redis({
      host: "localhost",
      port: 6379,
    });
    ShieldRedis = new shieldWindow({ client: redis, prefix: "sh:" });
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

export { ShieldRedis, redis };
