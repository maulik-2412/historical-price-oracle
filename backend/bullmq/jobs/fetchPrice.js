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

  // Save to MongoDB
  await Price.updateOne(
    { token, network, timestamp },
    { price },
    { upsert: true }
  );

  // Cache in Redis
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

  // If timestamp is before Jan 1, 2021, reset it to Jan 1, 2021
  const MIN_TIMESTAMP = 1609459200; // 2021-01-01T00:00:00Z
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

/* async function getCoinGeckoHistoricalPrice(tokenAddress, timestamp, network) {
  try {
    const platformMap = {
      ethereum: "ethereum",
      polygon: "polygon-pos",
    };

    const platform = platformMap[network] || "ethereum";
    console.log(platform);

    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 365 * 24 * 60 * 60;
    if (timestamp < oneYearAgo) {
      console.warn(
        `⏳ Skipping CoinGecko: ${tokenAddress} at ${timestamp} exceeds 365-day limit`
      );
      return null; // allow fallback to Alchemy or Interpolation
    }

    const date = new Date(timestamp * 1000).toISOString().split("T")[0];

    const tokenInfoUrl = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${tokenAddress}`;
    const tokenResponse = await coingeckoLimiter.schedule(() =>
      axios.get(tokenInfoUrl, {
        timeout: 15000,
      })
    );

    const coinId = tokenResponse.data.id;
    console.log("coin", coinId);

    const priceUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${date
      .split("-")
      .reverse()
      .join("-")}&localization=false`;

    const fetchprice = async () => {
      const priceResponse = await coingeckoLimiter.schedule(() =>
        axios.get(priceUrl, {
          timeout: 7000,
          headers: {
            x_cg_pro_api_key: process.env.COINGECKO_API_KEY,
          },
        })
      );
      const price = priceResponse.data.market_data?.current_price?.inr || null;
      if (!price) {
        throw new Error("Price not found for the given date");
      }
      return price;
    };

    return await pRetry(fetchprice, {
      retries: 5,
      factor: 2,
      minTimeout: 2000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        console.warn(
          `Retry ${error.attemptNumber} for ${tokenAddress}: ${error.message}`
        );
      },
    });
  } catch (error) {
    console.error("CoinGecko API error:", error.message);
    return null;
  }
}
 */
