import { Worker } from "bullmq";
import { fetchPrice } from "../jobs/fetchPrice.js";
import { connection } from "../connection.js";

export const priceWorker = new Worker(
  "priceQueue",
  async (job) => {
    await fetchPrice(job);
  },
  {
    connection: connection,
    concurrency: 2,
    limiter: {
      max: 40,
      duration: 1000,
    },
  }
);

priceWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

priceWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});
