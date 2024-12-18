import express, {Application, Request, Response} from 'express'; 
import "dotenv/config";
import cors from 'cors';
import { createServer } from 'http';
import { ProtectionHandler } from './handlers/protection-handler';
import './config/redis';
import './config/tb-redis';
import './config/redis-store';
import './config/lb-redis';

const app : Application = express(); 
const port = process.env.PORT || 3000;

const server = createServer(app);

// * Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/protection", ProtectionHandler);


app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello, World!' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});