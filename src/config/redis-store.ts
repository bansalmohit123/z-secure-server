import {redis } from "./redis";
import shieldWindow from "../lib/Shield/cache";
import RedisTokenBucketStore from "../lib/Token-Bucket/cache";
import FWRedisStore from "../lib/Fixed-Window/cache";
import LeakyBucketRedisStore from "../lib/Leaky-Bucket/cache";



let TokenBucketRedis: RedisTokenBucketStore;
let ShieldRedis: shieldWindow;
let FixedWindowRedis: FWRedisStore;
let LeakyBucketRedis: LeakyBucketRedisStore;


LeakyBucketRedis = new LeakyBucketRedisStore({ client: redis, prefix: "lb:" });
TokenBucketRedis = new RedisTokenBucketStore({ client: redis, prefix: "tb:" });
ShieldRedis = new shieldWindow({ client: redis, prefix: "sh:" });
FixedWindowRedis = new FWRedisStore({ client: redis, prefix: "fw:" });


export { TokenBucketRedis, ShieldRedis, FixedWindowRedis, LeakyBucketRedis };