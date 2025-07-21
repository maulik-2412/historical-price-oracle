import Bottleneck from 'bottleneck';

export const coingeckoLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1500, 
});
