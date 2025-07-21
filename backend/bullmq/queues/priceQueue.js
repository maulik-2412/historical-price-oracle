import { Queue } from "bullmq";
import { connection } from "../connection.js";

export const priceQueue = new Queue("priceQueue", {
  connection: connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
  limiter: {
    max: 5,
    duration: 1000,
  },
});
