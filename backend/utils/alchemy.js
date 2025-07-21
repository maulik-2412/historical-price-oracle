import { Alchemy, Network } from "alchemy-sdk";
import pRetry from "p-retry";

const networkMap = {
  ethereum: Network.ETH_MAINNET,
  polygon: Network.MATIC_MAINNET,
};

export const getAlchemyInstance = (network) => {
  return new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: networkMap[network],
  });
};

export const getTokenCreationDate = async (token, network) => {
  const fetchTransfers = async () => {
    try {
      const alchemy = getAlchemyInstance(network);
      const transfers = await alchemy.core.getAssetTransfers({
        contractAddresses: [token],
        category: ["erc20"],
        order: "asc",
        maxCount: 1,
      });
      console.log("Transfers data:", transfers);
      const firstTransfer = transfers.transfers?.[0];
      if (!firstTransfer) {
        console.warn("⚠️ No transfers found, defaulting to 1 year ago.");
        return Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
      }

      const block = await alchemy.core.getBlock(firstTransfer.blockNum);
      console.log("Block data:", block);
      const timestamp = block?.timestamp;

      if (!timestamp || timestamp > Math.floor(Date.now() / 1000)) {
        console.warn(
          "⚠️ Invalid or future block timestamp — defaulting to 1 year ago."
        );
        return Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
      }
      console.log('timestamp:', timestamp);
      return timestamp;
    } catch (error) {
      if (
        error?.response?.status === 429 ||
        error?.message?.includes("429") ||
        error?.code === "RATE_LIMIT_EXCEEDED"
      ) {
        const retryAfter = parseInt(
          error?.response?.headers?.["retry-after"] || "1",
          10
        );
        console.warn(`🚦 Rate limit hit, retrying after ${retryAfter} seconds`);
        await new Promise((res) => setTimeout(res, retryAfter * 1000));
        throw new pRetry.AbortError(error);
      }

      throw error;
    }
  };
  try {
    const first = await pRetry(fetchTransfers, {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      onFailedAttempt: (error) => {
        console.warn(
          `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left. Reason: ${error.message}`
        );
      },
    });
    console.log("First transfer data:", first);
    return first;
  } catch (error) {
    console.error("Failed to fetch token creation date:", error.message);
    return Math.floor(Date.now() / 1000);
  }
};
