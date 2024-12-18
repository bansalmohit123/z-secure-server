import { Router, Request, Response } from 'express';
import fixedWindow from '../lib/Fixed-Window/fs-new';
import { redis } from '../config/redisCofig';
import prisma from '../config/db.config'; // Assuming you have prisma client setup
// async function fixedWindow({ user_ID, limit, windowMs, API_KEY, store }: FixedWindow): Promise<boolean> {

// const router = Router();

// router.get('/fwi', (req: Request, res: Response) => {
//     //request will contain API key, algorithm configuration.
//     // check is API key is valid from postgres db.
//     // if valid, store this configuration in redis with some ttl and in postgres db.
//     // else return invalid API key.
//     //return success message.
// }
// );

// // request will contain user_ID, API_KEY.
// router.post('/fw', (req: Request, res: Response) => {
//     //check if API_key is valid. either present in redis or check in postgres.
//     // if valid, call fixedWindow function.
//     // else return invalid API key.
//     //fetch algorithm configurtion for this particular user from redis if present. otherwise check postgres.
//     //call fixedWindow function.
//     // if fucntion returns true, return success message.
//     // else return rate limit exceeded.
// }
// );


const router = Router();

// GET endpoint for storing algorithm configuration in Redis and PostgreSQL
router.get('/fwi', async (req: Request, res: Response): Promise<void> => {
    const { API_KEY, algoConfig, userId, identificationKey } = req.body;

    // Check if API key is valid by querying Postgres via Prisma
    const apiKey = await prisma.apiKey.findUnique({
        where: { key: String(API_KEY) },
        include: { user: true },
    });

    if (!apiKey) {
        return res.status(400).json({ message: 'Invalid API Key' });
    }

    // Store in Redis
    await redis.set(identificationKey, JSON.stringify(algoConfig), 'EX', 3600); // TTL 1 hour

    // Store in PostgreSQL
    await prisma.algorithmConfig.create({
        data: {
            userId: apiKey.userId,
            identificationKey: identificationKey,
            algoConfig: algoConfig, // Store the config as JSON
        },
    });

    return res.status(200).json({ message: 'Algorithm configuration saved successfully' });
});

// POST endpoint to apply fixed window rate limiting
router.post('/fw', async (req: Request, res: Response): Promise<Response> => {
    const { userId, API_KEY, identificationKey, algoConfig } = req.body;

    // Check if API key is valid (either from Redis or PostgreSQL)
    const apiKey = await prisma.apiKey.findUnique({
        where: { key: String(API_KEY) },
        include: { user: true },
    });

    if (!apiKey) {
        return res.status(400).json({ message: 'Invalid API Key' });
    }

    

    if (!algoConfig) {
        const configFromDB = await prisma.algorithmConfig.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }, // Fetch the most recent configuration
        });

        if (configFromDB) {
            algoConfig = JSON.stringify(configFromDB.algoConfig);
            await redis.set(`fw:${userId}`, algoConfig, 'EX', 3600); // Cache in Redis with TTL
        } else {
            return res.status(400).json({ message: 'No algorithm configuration found' });
        }
    }

    // Parse the algorithm config and apply fixed window algorithm
    const config = JSON.parse(algoConfig);
    const result = await fixedWindow({ userId, ...config }); // Assuming `fixedWindow` accepts these params

    if (result) {
        return res.status(200).json({ message: 'Request allowed' });
    } else {
        return res.status(429).json({ message: 'Rate limit exceeded' });
    }
});

export default router;
