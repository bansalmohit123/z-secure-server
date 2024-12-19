import { Request, Response, Router } from 'express';
import prisma from '../config/db.config';
import { redis, FixedWindowRedis } from '../config/redis';
import fixedWindow from '../lib/Fixed-Window/fs-new';

// Define the request body type
interface FWRequestBody {
    API_KEY: string;
    limit: number;
    windowMs: number;
    userId: string;
    identificationKey: string;
}
interface FWIRequestBody {
    API_KEY: string;
    limit: number;
    windowMs: number;
    identificationKey: string;
}

// Helper function for error logging
const handleError = (res: Response, error: unknown, message = 'Internal Server Error') => {
    console.error(message, error);
    return res.status(500).json({ message });
};

// Handler for storing algorithm configuration
export const storeAlgoConfigHandler = async (
    req: Request<{}, {}, FWIRequestBody>,
    res: Response
): Promise<Response> => {
    const { API_KEY, limit, windowMs, identificationKey } = req.body;

    if (!API_KEY || !limit || !windowMs || !identificationKey) {
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

        await redis.set(identificationKey, JSON.stringify({ limit, windowMs }), 'EX', 3600);

        return res.status(200).json({ message: 'Algorithm configuration saved successfully' });
    } catch (error) {
        return handleError(res, error, 'Error saving algorithm configuration');
    }
};

// Handler for applying fixed window rate limiting
export const limitRouteHandler = async (
    req: Request<{}, {}, FWRequestBody>,
    res: Response
): Promise<Response> => {
    const { userId, API_KEY, identificationKey, limit, windowMs } = req.body;

    console.log('Received request:', { userId, API_KEY, identificationKey, limit, windowMs });

    if (!API_KEY || !limit || !windowMs || !userId || !identificationKey) {
        console.log('Missing required parameters');
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
            if (algoConfig.limit !== limit || algoConfig.windowMs !== windowMs) {
                await redis.set(identificationKey, JSON.stringify({ limit, windowMs }), 'EX', 3600);
                console.log('Updated algorithm config in Redis:', { limit, windowMs });
            }
        } else {
            await redis.set(identificationKey, JSON.stringify({ limit, windowMs }), 'EX', 3600);
            console.log('Stored new algorithm config in Redis:', { limit, windowMs });
        }

        const decision = await fixedWindow({
            user_ID: userId,
            limit,
            windowMs,
            API_KEY,
            store: FixedWindowRedis,
        });

        console.log('Rate limiting decision:', decision);

        if (decision) {
            return res.status(200).json({ message: 'Request allowed' });
        } else {
            return res.status(429).json({ message: 'Rate limit exceeded' });
        }
    } catch (error) {
        console.error('Error processing fixed window rate limiting:', error);
        return handleError(res, error, 'Error processing fixed window rate limiting');
    }
};