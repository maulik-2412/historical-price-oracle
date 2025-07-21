import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({
  url: process.env.REDIS_URI,
  maxRetriesPerRequest: null,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function connectRedis() {
  await redisClient.connect();
  console.log('Redis connected');
}

