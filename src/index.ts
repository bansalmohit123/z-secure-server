import express, {Application, Request, Response} from 'express'; 
import "dotenv/config";
import cors from 'cors';
import { createServer } from 'http';
import { storeAlgoConfigHandler, limitRouteHandler } from './handlers/fw-handlers';
import './config/redis';



const app : Application = express(); 
const port = process.env.PORT || 3000;

const server = createServer(app);

// * Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post('/fwi', storeAlgoConfigHandler);
app.post('/fw', limitRouteHandler);

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello, World!' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});