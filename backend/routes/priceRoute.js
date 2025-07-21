import express from "express";
import axios from "axios";
import Price from "../models/price.js";
import { redisClient } from "../redis/redisClient.js";
import { getAlchemyInstance } from "../utils/alchemy.js";
import { getPriceWithInterpolation } from "../services/getPriceWithInterpolation.js";

const router = express.Router();

const alchemyNetworkMap = {
  ethereum: "eth-mainnet",
  polygon: "polygon-mainnet",
};

router.get("/price", async (req, res) => {
  try {
    const { token, network, timestamp } = req.query;
    console.log('timestamp:', timestamp);
    if (!token || !network || !timestamp) {
      return res.status(400).json({ error: "Missing required query params" });
    }

    const normalizedNetwork = network.toLowerCase();
    const ts = Number(timestamp);
    const cacheKey = `price:${token}:${normalizedNetwork}:${ts}`;

    // 1️⃣ Try Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ ...JSON.parse(cached), source: "cache" });
    }

    // 2️⃣ Try MongoDB
    const priceDoc = await Price.findOne({
      token,
      network: normalizedNetwork,
      timestamp: ts,
    });

    if (priceDoc) {
      const result = {
        price: priceDoc.price,
        source: "alchemy",
      };
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 300 });
      return res.json(result);
    }

    // 3️⃣ Try Alchemy API
    const alchemyNetwork = alchemyNetworkMap[normalizedNetwork];
    if (!alchemyNetwork) {
      return res.status(400).json({ error: "Unsupported network" });
    }

    const start = new Date(ts * 1000).toISOString();
    const end = new Date((ts + 86399) * 1000).toISOString();

    const alchemyRes = await axios.post(
      `https://api.g.alchemy.com/prices/v1/${process.env.ALCHEMY_API_KEY}/tokens/historical`,
      {
        network: alchemyNetwork,
        address: token,
        startTime: start,
        endTime: end,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    const alchemyPrice = alchemyRes.data?.data?.[0]?.value;

    if (alchemyPrice) {
      const result = { price: alchemyPrice, source: "alchemy" };
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 300 });

      // Optional: Save to DB
      await Price.create({
        token,
        network: normalizedNetwork,
        timestamp: ts,
        price: alchemyPrice,
      });

      return res.json(result);
    }

    // 4️⃣ Interpolate if Alchemy fails
    const alchemy = getAlchemyInstance(normalizedNetwork);
    const interpolated = await getPriceWithInterpolation(token, normalizedNetwork, ts, alchemy);

    if (interpolated) {
      const result = {
        price: interpolated.price,
        source: "interpolated",
      };
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 300 });
      return res.json(result);
    }

    // ❌ No result found
    return res.status(404).json({ error: "Price not found" });
  } catch (err) {
    console.error("GET /price error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

