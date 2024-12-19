// import { Request, Response, Router } from 'express';
// import prisma from '../config/db.config';
// import {redis} from '../config/redis';
// import tokenBucket from '../lib/Token-Bucket/tb-new';
// import { TokenBucketRedis }from '../config/redis-store';



// interface TBRequestBody {
//     API_KEY: string;
//     limit: number;
//     refillRate: number;
//     userId: string;
//     identificationKey: string;
// }

// interface TBIRequestBody {
//     API_KEY: string;
//     limit: number;
//     refillRate: number;
//     identificationKey: string;
// }

// const handleError = (res: Response, error: unknown, message = 'Internal Server Error') => {
//     console.error(message, error);
//     return res.status(500).json({ message });
// };

// export const tbstoreAlgoConfigHandler = async (
//     req: Request<{}, {}, TBIRequestBody>,
//     res: Response
// ): Promise<Response> => {
//     const { API_KEY, limit, refillRate, identificationKey } = req.body;

//     if (!API_KEY || !limit || !refillRate || !identificationKey) {
//         return res.status(400).json({ message: 'Missing required parameters' });
//     }

//     try {
//         const apiKey = await prisma.apiKey.findUnique({
//             where: { key: API_KEY },
//             include: { user: true },
//         });
        

//         if (!apiKey) {
//             return res.status(400).json({ message: 'Invalid API Key' });
//         }

//         await redis.set(identificationKey, JSON.stringify({ limit, refillRate }), 'EX', 3600);

//         return res.status(200).json({ message: 'Algorithm configuration saved successfully' });
//     } catch (error) {
//         return handleError(res, error, 'Error saving algorithm configuration');
//     }
// };

// export const tblimitRouteHandler = async (
//     req: Request<{}, {}, TBRequestBody>,
//     res: Response
// ): Promise<Response> => {
//     const { API_KEY, limit, refillRate, userId, identificationKey } = req.body;

//     console.log('Received request:', { userId, API_KEY, identificationKey, limit, refillRate });

//     if (!API_KEY || !limit || !refillRate || !userId || !identificationKey) {
//         return res.status(400).json({ message: 'Missing required parameters' });
//     }

//     try {
//         let apiKey = await redis.get(`api_key:${API_KEY}`);
//         console.log('Fetched API key from Redis:', apiKey);

//         if (!apiKey) {
//             const apiKeyFromDB = await prisma.apiKey.findUnique({
//                 where: { key: API_KEY },
//                 include: { user: true },
//             });

//             if (!apiKeyFromDB) {
//                 console.log('Invalid API Key');
//                 return res.status(400).json({ message: 'Invalid API Key' });
//             }

//             await redis.set(`api_key:${API_KEY}`, JSON.stringify(apiKeyFromDB), 'EX', 3600);
//             apiKey = JSON.stringify(apiKeyFromDB);
//             console.log('Stored API key in Redis:', apiKey);
//         }

//         const redisAlgoConfig = await redis.get(identificationKey);
//         console.log('Fetched algorithm config from Redis:', redisAlgoConfig);

//         if(redisAlgoConfig){
//             const algoConfig = JSON.parse(redisAlgoConfig);
//             console.log('Algorithm config:', algoConfig);
//             if(algoConfig.limit!=limit || algoConfig.refillRate!=refillRate){
//                 await redis.set(identificationKey, JSON.stringify({ limit, refillRate }), 'EX', 3600);
//                 console.log('Updated algorithm config in Redis:', { limit, refillRate });
//             }
//         }
//         else{
//             await redis.set(identificationKey, JSON.stringify({ limit, refillRate }), 'EX', 3600);
//             console.log('Stored new algorithm config in Redis:', { limit, refillRate });
//         }

//         const decision = await tokenBucket({
//             user_ID: userId,
//             limit,
//             refillRate,
//             API_KEY,
//             store: TokenBucketRedis,
//         });
//         console.log('Rate limiting decision:', decision);

//         if (decision) {
//             return res.status(200).json({ message: 'Request allowed' });
//         } else {
//             return res.status(429).json({ message: 'Rate limit exceeded' });
//         }

       
//     } catch (error) {
//         return handleError(res, error, 'Error applying rate limiting');
//     }
// };  