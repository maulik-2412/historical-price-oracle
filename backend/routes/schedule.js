import express from "express";
import { priceQueue } from "../bullmq/queues/priceQueue.js";
import { getTokenCreationDate } from "../utils/alchemy.js";
import { v4 as uuid } from "uuid";
import { redisClient } from "../redis/redisClient.js";

const router = express.Router();

router.post("/schedule", async (req, res) => {
  const { token, network } = req.body;
  console.log("Scheduling jobs for token:", token, "on network:", network);
  if (!token || !network) {
    return res.status(400).json({ error: "token and network are required" });
  }

  try {
    const startTimestamp = await getTokenCreationDate(token, network);
    console.log(
      `Token creation date for ${token} on ${network}:`,
      startTimestamp
    );
    const now = Math.floor(Date.now() / 1000);

    const groupId = uuid(); 
    const jobs = [];
    const jobIds = [];

    for (let ts = startTimestamp; ts <= now; ts += 86400) {
      const jobName = `${token}-${network}-${ts}`;
      jobs.push({
        name: jobName,
        data: { token, network, timestamp: ts },
      });
      jobIds.push(jobName);
    }

    const createdJobs=await priceQueue.addBulk(jobs);
    const actualJobIds = createdJobs.map(job => job.id);
    await redisClient.rPush(`group:${groupId}`, ...actualJobIds);
    await redisClient.expire(`group:${groupId}`, 86400);

    res.status(200).json({
      message: "Jobs scheduled",
      count: jobs.length,
      groupId,
    });
  } catch (err) {
    console.error("Error scheduling jobs:", err);
    res.status(500).json({ error: "Failed to schedule jobs" });
  }
});


router.get("/schedule/:groupId", async (req, res) => {
  const { groupId } = req.params;

  try {
    const keyExists = await redisClient.exists(`group:${groupId}`);
    console.log("Redis key exists:", keyExists);
    const jobIds = await redisClient.lRange(`group:${groupId}`, 0, -1); 
    console.log("Fetching progress for group:", groupId, "with jobs:", jobIds);
    const jobs = await Promise.all(jobIds.map((id) => priceQueue.getJob(id)));

    let completed = 0;
    let failed = 0;
    let active = 0;
    let waiting = 0;

    for (const job of jobs) {
      if (!job) continue;
      const state = await job.getState();

      if (state === "completed") completed++;
      else if (state === "failed") failed++;
      else if (state === "active") active++;
      else if (state === "waiting") waiting++;
    }

    const total = jobs.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    return res.json({
      completed,
      failed,
      active,
      waiting,
      total,
      percent,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return res.status(500).json({ error: "Failed to fetch progress" });
  }
});

export default router;
