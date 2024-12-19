// const payload = {
//     key: this.API_KEY,
//     identificationKey: this.identificationKey,
//     rateLimiting: {
//       rule: this.rateLimitingRule,
//       userId: userID ??  userIp, // Use IP for rate-limiting
//       requested: requestedTokens || 1,
//     },
//     shield: {
//       rule: this.shieldRule,
//       requestDetails: {
//         request: req,
//       },
//     },
//   };

import {redis} from '../config/redis';
import prisma from '../config/db.config';
import fixedWindow from '../lib/Fixed-Window/fs-new';
import tokenBucket from '../lib/Token-Bucket/tb-new';
import leakyBucket from '../lib/Leaky-Bucket/lb-new';
import  Protect from '../lib/Shield/sh-new';
import { TokenBucketRedis, ShieldRedis, FixedWindowRedis, LeakyBucketRedis } from '../config/redis-store';

interface TokenBucketRule {
    mode: "LIVE" | "DRY_RUN";
    refillRate: number;
    interval: number;
    capacity: number;
  }
  
  interface FixedWindowRule {
    mode: "LIVE" | "DRY_RUN";
    windowMs: number;
    limit: number;
  }
  
  interface LeakyBucketRule {
    mode: "LIVE" | "DRY_RUN";
    leakRate: number;
    capacity: number;
    timeout : number;
  }
  
  interface SlidingWindowRule {
    mode: "LIVE" | "DRY_RUN";
    windowMs: number;
    limit: number;
  }
  
  // Shield rule
  interface ShieldRule {
    mode: "LIVE" | "DRY_RUN";
    windowMs: number;
    limit: number;
    threshold: number;
  }
  
  // Create a union type for the different rate-limiting algorithms
  type RateLimitingAlgorithm =
    | { algorithm: "TokenBucketRule"; rules: TokenBucketRule }
    | { algorithm: "FixedWindowRule"; rules: FixedWindowRule }
    | { algorithm: "LeakyBucketRule"; rules: LeakyBucketRule }
    | { algorithm: "SlidingWindowRule"; rules: SlidingWindowRule };
  


interface Payload {
    key: string;
    identificationKey: string;
    userId : string;
    rateLimiting?: {
        rule: RateLimitingAlgorithm;
        requested: number;
    };
    shield?: {
        rule: ShieldRule;
        request: Request;
    };
}

// payload api will be reveiving





import { Request, Response } from 'express';

export const ProtectionHandler = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { key, identificationKey, rateLimiting, shield, userId } = req.body as unknown as Payload;

    console.log('Received request:', { key, identificationKey, rateLimiting, shield });

    if (!key || !identificationKey) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    try {
        //first check for api key in redis
        //if not found then check in db
        //  if not found then return invalid api key
        let apiKey = await redis.get(`api_key:${key}`);
        console.log('Fetched API key from Redis:', apiKey);

        if (!apiKey) {
            const apiKeyFromDB = await prisma.apiKey.findUnique({
                where: { key: key },
                include: { user: true },
            });

        if (!apiKeyFromDB) {
                console.log('Invalid API Key');
                return res.status(400).json({ message: 'Invalid API Key' });
            }

            await redis.set(`api_key:${key}`, JSON.stringify(apiKeyFromDB), 'EX', 3600);
            apiKey = JSON.stringify(apiKeyFromDB);
            console.log('Stored API key in Redis:', apiKey);
        }
        let result = true;
        let shield_result = true;
        if(rateLimiting){
            const { rule, requested } = rateLimiting;
            const { algorithm, rules } = rule;
            if (algorithm === 'TokenBucketRule') {
                const { refillRate, interval, capacity } = rules;
                result = await tokenBucket({
                    user_ID: userId,
                    refillRate,
                    capacity,
                    API_KEY: key,
                    store: TokenBucketRedis,
                    identificationKey
                });
                
            } else if (algorithm === 'FixedWindowRule') {
                const { algorithm, rules } = rule;
                const { windowMs, limit } = rules;
                result = await fixedWindow({
                    user_ID: userId,
                    limit,
                    windowMs,
                    API_KEY: key,
                    store: FixedWindowRedis,
                    identificationKey
                });
            } else if (algorithm === 'LeakyBucketRule') {
                const { leakRate, capacity, timeout } = rules;
                result = await leakyBucket({
                    user_ID: userId,
                    capacity,
                    refillRate : leakRate,
                    refillIntervalMs : timeout,
                    API_KEY : key,
                    identificationKey,
                    store : LeakyBucketRedis,
                });
            } else if (algorithm === 'SlidingWindowRule') {
                const { windowMs, limit } = rules;
                result = true;
            }
        }
        if(shield){
            const { rule, request } = shield;
            const { windowMs, limit, threshold } = rule;
            shield_result = await Protect({
                req : request,
                user_ID: userId,
                limit,
                windowMs,
                API_KEY: key,
                store: ShieldRedis,
                identificationKey
            });
        }
        if(result && shield_result){
            return res.status(200).json({ message: 'Request allowed', isdenied : false });
        }
        else if(!result && !shield_result){
            return res.status(429).json({ message: 'Rate limit exceeded or harmful content present in request', isdenied : true });
        }
        else if(!shield_result){
            return res.status(403).json({ message: 'Request denied by due to harmful content', isdenied : true });
        }
        else{
            return res.status(429).json({ message: 'Rate limit exceeded', isdenied : true });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error saving algorithm configuration', error: error.message, isdenied : false });
    }
}
