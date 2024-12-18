import { Redis } from "ioredis";
import RedisStore from "../lib/Fixed-Window/cache";

let redis: Redis;
let FixedWindowRedis: RedisStore;

if (process.env.NODE_ENV === "production") {
  redis = new Redis(process.env.REDIS_URL as string);
  FixedWindowRedis = new RedisStore({ client: redis, prefix: "fw:" });
} else {
  redis = new Redis({
    host: "localhost",
    port: 6379,
  });
  FixedWindowRedis = new RedisStore({ client: redis, prefix: "fw:" });
}

export {FixedWindowRedis, redis};
