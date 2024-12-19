import { Request, Response, Router } from 'express';
import prisma from '../config/db.config';
import {redis , LeakyBucketRedis} from '../config/lb-redis';
import leakyBucket from '../lib/Leaky-Bucket/lb-new';

interface LBRequestBody {
    API_KEY: string;
    capacity: number;
    refillRate: number;
    refillIntervalMs: number;
    userId: string;
    identificationKey: string;
}

interface LBIRequestBody {
    API_KEY: string;
    capacity: number;
    refillRate: number;
    refillIntervalMs: number;
    identificationKey: string;
}

const handleError = (res: Response, error: unknown, message = 'Internal Server Error') => {
    console.error(message, error);
    return res.status(500).json({ message });
};

export const lbstoreAlgoConfigHandler = async (
    req: Request<{}, {}, LBIRequestBody>,
    res: Response
): Promise<Response> => {
    const { API_KEY, capacity, refillRate, identificationKey ,refillIntervalMs} = req.body;

    if (!API_KEY || !capacity || !refillRate || !identificationKey || !refillIntervalMs) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    try {
        const apiKey = await prisma.apiKey.findUnique({
            where: { key: API_KEY },
            include: { user: true },
        });
        

        if (!apiKey) {
            return res.status(400).json({ message: 'Invalid API Key' });
        }

        await redis.set(identificationKey, JSON.stringify({ capacity, refillRate , refillIntervalMs}), 'EX', 3600);

        return res.status(200).json({ message: 'Algorithm configuration saved successfully' });
    } catch (error) {
        return handleError(res, error, 'Error saving algorithm configuration');
    }
};

export const lblimitRouteHandler = async (
    req: Request<{}, {}, LBRequestBody>,
    res: Response
): Promise<Response> => {
    const { userId, API_KEY, identificationKey, capacity, refillRate ,refillIntervalMs} = req.body;

    console.log('Received request:', { userId, API_KEY, identificationKey, capacity, refillRate ,refillIntervalMs});

    if (!userId || !API_KEY || !identificationKey||!capacity || !refillRate || !refillIntervalMs) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    try {
        
        let apiKey = await redis.get(`api_key:${API_KEY}`);
        console.log('Fetched API key from Redis:', apiKey);

        if (!apiKey) {
            const apiKeyFromDB = await prisma.apiKey.findUnique({
                where: { key: API_KEY },
                include: { user: true },
            });

            if (!apiKeyFromDB) {
                console.log('Invalid API Key');
                return res.status(400).json({ message: 'Invalid API Key' });
            }

            await redis.set(`api_key:${API_KEY}`, JSON.stringify(apiKeyFromDB), 'EX', 3600);
            apiKey = JSON.stringify(apiKeyFromDB);
            console.log('Stored API key in Redis:', apiKey);
        }

        const redisAlgoConfig = await redis.get(identificationKey);
        console.log('Fetched algorithm config from Redis:', redisAlgoConfig);

        if (redisAlgoConfig) {
            const algoConfig = JSON.parse(redisAlgoConfig);
            if (algoConfig.capacity !== capacity || algoConfig.refillRate !== refillRate||algoConfig.refillIntervalMs!==refillIntervalMs) {
                await redis.set(identificationKey, JSON.stringify({ capacity, refillRate,refillIntervalMs }), 'EX', 3600);
                console.log('Updated algorithm config in Redis:', { capacity, refillRate ,refillIntervalMs});
            }
        } else {
            await redis.set(identificationKey, JSON.stringify({ capacity, refillRate,refillIntervalMs }), 'EX', 3600);
            console.log('Stored new algorithm config in Redis:', { capacity, refillRate,refillIntervalMs });
        }

        const decision = await leakyBucket({
            user_ID: userId,
            capacity,
            refillIntervalMs ,
            refillRate,
            API_KEY,
            store: LeakyBucketRedis,
        });

        console.log('Rate limiting decision:', decision);

        if (decision) {
            return res.status(200).json({ message: 'Request allowed' });
        } else {
            return res.status(429).json({ message: 'Rate limit exceeded' });
        }
      
    } catch (error) {
        return handleError(res, error, 'Error processing request');
    }
};