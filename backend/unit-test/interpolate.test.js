import { describe, it, expect } from 'vitest';
import { interpolate } from '../utils/interpolate.js'; 

describe('interpolate', () => {
  it('should return exact value if tsBefore equals tsAfter', () => {
    const result = interpolate(1000, 1000, 5, 1000, 10);
    expect(result).toBe(5);
  });

  it('should interpolate midway when tsQuery is exactly between tsBefore and tsAfter', () => {
    const result = interpolate(1500, 1000, 2, 2000, 4);
    expect(result).toBe(3);
  });

  it('should return priceBefore if tsQuery equals tsBefore', () => {
    const result = interpolate(1000, 1000, 10, 2000, 20);
    expect(result).toBe(10);
  });

  it('should return priceAfter if tsQuery equals tsAfter', () => {
    const result = interpolate(2000, 1000, 10, 2000, 20);
    expect(result).toBe(20);
  });

  it('should interpolate correctly with decimal prices', () => {
    const result = interpolate(1100, 1000, 1.5, 1200, 2.5);
    expect(result).toBe(2.0);
  });

  it('should work for inverse time direction', () => {
    const result = interpolate(1500, 2000, 4, 1000, 2);
    expect(result).toBe(3);
  });

  it('should interpolate with negative prices', () => {
    const result = interpolate(1500, 1000, -2, 2000, -4);
    expect(result).toBe(-3);
  });
});
