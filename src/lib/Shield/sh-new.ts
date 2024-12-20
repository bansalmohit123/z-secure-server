// rate limiting function using shield algorithm with shield increment
// input : user_ID, limit, windowMs, API_KEY.

// output : rate limit exceeded or not.

// single redis store will handle all the users using our rate limiting service for their servers.

// fetch from redis : RedisStore.API_KEY.user_ID = {currentWindowHits, previousWindowHits, resetTime}
// calculate effectiveCount using overlap between windows.

// if effectiveCount > limit, return rate limit exceeded.
// else increment currentWindowHits and return rate limit not exceeded.

import ShieldRedisStore from "./cache";
import {detectSQLInjectionPatterns, detectLfiPatterns, detectXSSPatterns} from "./patterns";

interface ShieldWindow {
  user_ID: string;
  limit: number;
  windowMs: number;
  API_KEY: string;
  store: ShieldRedisStore;
  req : any;
  identificationKey: string;
}


export function detectMaliciousRequest(
  req: any,
): { isSuspicious: boolean; attackTypes: string[] } {
  const attackTypes: string[] = [];
  const patterns = [
    { name: "XSS", patterns: detectXSSPatterns },
    { name: "SQL Injection", patterns: detectSQLInjectionPatterns },
    { name: "LFI", patterns: detectLfiPatterns }
  ];
  const {body, params ,query} = req;

  // Check enabled attack detection options
  console.log(req.body);
  console.log(req.query);
  console.log(req.params);
  console.log("+++++++++++");

  const parts = [{ query }, { body }, { params }];

  parts.forEach(part => {
    patterns.forEach(({ name, patterns }) => {
      if (isAttackDetected(part, patterns)) {
        console.log(`${name} detected`);
        attackTypes.push(name);
      }
    });
  });

  console.log("Attack types:", attackTypes);

  return {
    isSuspicious: attackTypes.length > 0,
    attackTypes,
  };
}

function isAttackDetected(
  input: object,
  patterns: RegExp[]
): boolean {
  console.log(input);
  function scanValues(values: any[]): boolean {
    return values.some(value => {
      if (typeof value === 'string') {
        return patterns.some(pattern => pattern.test(value));
      } else if (typeof value === 'object' && value !== null) {
        // Recursively check nested objects or arrays
        return isAttackDetected(value, patterns);
      } else {
        return false;
      }
    });
  }

  return scanValues(Object.values(input));
}



async function Protect({ user_ID, windowMs, limit, req  , API_KEY, store, identificationKey }: ShieldWindow): Promise<boolean> {

const key = `${API_KEY},${identificationKey}.${user_ID}`;
try {
  console.log("Shield window rate limiting:", { key });
  const beforeHits = await store.get(key);
  console.log("Before hits:", beforeHits);

  const { isSuspicious, attackTypes } = detectMaliciousRequest({
      body: req.body,
      query: req.query,
      params: req.params,
  });
  if (isSuspicious) {
      // console.log("Malicious request detected:", { attackTypes });
      try {
        const currentHits = await store.increment(key);
        if(currentHits > limit){
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error incrementing hits in shieldRateLimiter:", error);
        return false; // Fail-safe: Deny request on error
      }
  }
  console.log("Rate limit not exceeded for key:", key);
  return true;
} catch (error) {
  console.error("Error in shieldRateLimiter:", error);
  return true; // Fail-safe: Allow request on error
}
}


export default Protect;
