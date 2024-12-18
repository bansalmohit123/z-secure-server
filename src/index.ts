import express, {Application, Request, Response} from 'express'; 
import "dotenv/config";
import cors from 'cors';
import { create } from 'domain';
import { createServer } from 'http';




const app : Application = express(); 
const port = process.env.PORT || 3000;

const server = createServer(app);

// * Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
