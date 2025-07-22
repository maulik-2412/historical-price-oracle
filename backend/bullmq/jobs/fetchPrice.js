import { Job } from "bullmq";
import { getAlchemyInstance } from "../../utils/alchemy.js";
import Price from "../../models/price.js";
import { connection } from "../connection.js";
import pRetry from "p-retry";
import axios from "axios";
import { coingeckoLimiter } from "../../utils/limiter.js";
import { configDotenv } from "dotenv";
import Bottleneck from "bottleneck";
configDotenv();

const alchemyNetworkMap = {
  Ethereum: "eth-mainnet",
  Polygon: "polygon-mainnet",
};

const limiter = new Bottleneck({
  reservoir: 250,
  reservoirRefreshAmount: 250,
  reservoirRefreshInterval: 60 * 60 * 1000,
  maxConcurrent: 1,
});

export const fetchPrice = async (job) => {
  console.log("fetch price job started", job.id);
  const { token, network, timestamp } = job.data;
  const alchemy = getAlchemyInstance(network);

  const price = await getHistoricalTokenPrice(
    token,
    timestamp,
    network,
    alchemy
  );
  console.log(`Fetched price for ${token} at ${timestamp}:`, price);
  if (!price) throw new Error("Price fetch failed");

  await Price.updateOne(
    { token, network, timestamp },
    { price },
    { upsert: true }
  );

  await connection.set(
    `price:${token}:${network}:${timestamp}`,
    JSON.stringify({ price, source: "alchemy" }),
    "EX",
    300
  );

  return true;
};

async function getHistoricalTokenPrice(token, timestamp, network, alchemy) {
  const alchemyNetwork = alchemyNetworkMap[network];
  if (!alchemyNetwork) {
    console.error(`Unsupported network: ${network}`);
    return null;
  }

  const MIN_TIMESTAMP = 1609459200; 
  const adjustedTimestamp = Math.max(timestamp, MIN_TIMESTAMP);

  const start = new Date(adjustedTimestamp * 1000).toISOString();
  const end = new Date((adjustedTimestamp + 86399) * 1000).toISOString();

  const fetchPrice = async () => {
    const response = await axios.post(
      `https://api.g.alchemy.com/prices/v1/${process.env.ALCHEMY_API_KEY}/tokens/historical`,
      {
        network: alchemyNetwork,
        address: token,
        startTime: start,
        endTime: end,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log("response:", response.data);
    const price = response.data?.data[0].value;
    if (!price) {
      throw new Error(`Price not found for ${token} at ${start}`);
    }

    return price;
  };

  try {
    return await limiter.schedule(() =>
      pRetry(fetchPrice, {
        retries: 5,
        factor: 2,
        minTimeout: 2000,
        maxTimeout: 10000,
        onFailedAttempt: (error) => {
          console.warn(
            `Retry ${error.attemptNumber} for ${token} on ${alchemyNetwork}: ${error.message}`
          );
        },
      })
    );
  } catch (error) {
    console.error(
      `Alchemy price fetch failed for ${token} on ${alchemyNetwork}:`,
      error.message
    );
    return null;
  }
}

