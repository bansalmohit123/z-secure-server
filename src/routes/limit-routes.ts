import { Router, Request, Response } from 'express';

const router = Router();


router.post('/limit', (req: Request, res: Response) => {
    res.send('limit route');
}
);



export default router;