import { describe, expect, it } from 'vitest';
import { countPrimes, frameSummary } from './busy-work';

describe('countPrimes', () => {
  it('counts the primes below a limit', () => {
    expect(countPrimes(2)).toBe(0);
    expect(countPrimes(10)).toBe(4);
    expect(countPrimes(100)).toBe(25);
    expect(countPrimes(10_000)).toBe(1229);
  });

  it('runs from its own source text, as the jank demo worker does', () => {
    const rebuilt: unknown = new Function(`return (${countPrimes.toString()})`)();

    expect(typeof rebuilt).toBe('function');
    if (typeof rebuilt !== 'function') return;
    expect(rebuilt(1000)).toBe(168);
  });
});

describe('frameSummary', () => {
  it('reports no gap for one frame or none', () => {
    expect(frameSummary([])).toEqual({ frames: 0, longestGapMs: 0 });
    expect(frameSummary([16])).toEqual({ frames: 1, longestGapMs: 0 });
  });

  it('finds the longest gap between two frames in a row', () => {
    expect(frameSummary([0, 16, 33, 1250, 1266])).toEqual({ frames: 5, longestGapMs: 1217 });
  });
});
