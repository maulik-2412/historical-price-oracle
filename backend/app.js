import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/db.js';
import { connectRedis } from './redis/redisClient.js';
import priceRoute from './routes/priceRoute.js';
import scheduleRoute from './routes/schedule.js';
import { priceWorker } from './bullmq/queues/worker.js';
import cors from 'cors';

dotenv.config();



const app = express();
app.use(cors({
  origin: process.env.FRONTEND_API_URL || 'http://localhost:3000', 
}))

app.use(express.json());
app.use('/api', priceRoute);
app.use('/api', scheduleRoute);

connectDB();
connectRedis();

app.listen(process.env.PORT || 3001, () => {
  console.log('App started');
});
