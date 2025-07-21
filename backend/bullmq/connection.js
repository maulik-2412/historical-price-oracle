import IORedis from 'ioredis';
import { configDotenv } from 'dotenv';
configDotenv();

export const connection = new IORedis(process.env.REDIS_URI,{
    maxRetriesPerRequest: null
}); 

