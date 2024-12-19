import express, {Application, Request, Response} from 'express'; 
import "dotenv/config";
import cors from 'cors';
import { createServer } from 'http';
import { storeAlgoConfigHandler, limitRouteHandler } from './handlers/fw-handlers';
import {tbstoreAlgoConfigHandler, tblimitRouteHandler} from './handlers/tb-handlers';
import {shstoreAlgoConfigHandler, shlimitRouteHandler} from './handlers/sh-handlers';
import './config/redis';
import './config/tb-redis';
import './config/sh-redis';

const app : Application = express(); 
const port = process.env.PORT || 3000;

const server = createServer(app);

// * Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post('/fwi', storeAlgoConfigHandler);
app.post('/fw', limitRouteHandler);

app.post('/tbi', tbstoreAlgoConfigHandler);
app.post('/tb', tblimitRouteHandler);

app.post('/shi', shstoreAlgoConfigHandler);
app.post('/sh', shlimitRouteHandler);




app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello, World!' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});