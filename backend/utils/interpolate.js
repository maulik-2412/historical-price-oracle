export function interpolate(
  tsQuery,
  tsBefore,
  priceBefore,
  tsAfter,
  priceAfter
) {
  if (tsBefore === tsAfter) return priceBefore;
  const ratio = (tsQuery - tsBefore) / (tsAfter - tsBefore);
  return priceBefore + (priceAfter - priceBefore) * ratio;
}