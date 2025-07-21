import Price from '../models/price.js';
import { interpolate } from '../utils/interpolate.js';

export async function getPriceWithInterpolation(token, network, timestamp) {
  
  const exact = await Price.findOne({ token, network, timestamp });
  if (exact) return { price: exact.price, source: 'alchemy' };

  const before = await Price.findOne({ token, network, timestamp: { $lt: timestamp } }).sort({ timestamp: -1 });
  const after = await Price.findOne({ token, network, timestamp: { $gt: timestamp } }).sort({ timestamp: 1 });

  if (before && after) {
    const interpolatedPrice = interpolate(
      timestamp,
      before.timestamp,
      before.price,
      after.timestamp,
      after.price
    );
    return { price: interpolatedPrice, source: 'interpolated' };
  }

  if (before) return { price: before.price, source: 'before-only' };
  if (after) return { price: after.price, source: 'after-only' };

  return null;
}
