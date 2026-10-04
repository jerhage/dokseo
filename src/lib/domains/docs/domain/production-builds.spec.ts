import { describe, expect, it } from 'vitest';
import { LARGEST_SHOWN, byteFigure, exactBytes, loadSummary } from './production-builds';
import type { ResourceSize } from './production-builds';

const ORIGIN = 'https://localhost:5173';

function resource(
  path: string,
  initiatorType: string,
  decodedBodySize: number,
  transferSize = decodedBodySize + 300,
): ResourceSize {
  return {
    name: path.startsWith('http') ? path : `${ORIGIN}${path}`,
    initiatorType,
    transferSize,
    encodedBodySize: decodedBodySize,
    decodedBodySize,
  };
}

describe('byteFigure', () => {
  it('prints bytes below a kilobyte, decimal kilobytes and decimal megabytes', () => {
    expect(byteFigure(98)).toBe('98 B');
    expect(byteFigure(999)).toBe('999 B');
    expect(byteFigure(1000)).toBe('1.0 kB');
    expect(byteFigure(430_941)).toBe('430.9 kB');
    expect(byteFigure(6_756_071)).toBe('6.76 MB');
  });
});

describe('exactBytes', () => {
  it('groups the digits with commas', () => {
    expect(exactBytes(8_480_329)).toBe('8,480,329 bytes');
  });
});

describe('loadSummary', () => {
  it('counts only same-origin entries and groups them by initiator type', () => {
    const summary = loadSummary(
      [
        resource('/src/a.ts', 'script', 100),
        resource('/src/b.svelte', 'script', 300),
        resource('/fonts/x.woff2', 'css', 50),
        resource('https://cdn.jsdelivr.net/npm/x.wasm', 'fetch', 9000),
      ],
      ORIGIN,
    );

    expect(summary.count).toBe(3);
    expect(summary.decodedBytes).toBe(450);
    expect(summary.transferredBytes).toBe(1350);
    expect(summary.kinds).toEqual([
      { initiatorType: 'script', count: 2, decodedBytes: 400 },
      { initiatorType: 'css', count: 1, decodedBytes: 50 },
    ]);
  });

  it('orders the largest entries first, as paths, and marks one read from a cache', () => {
    const summary = loadSummary(
      [
        resource('/small.js?v=1', 'script', 10),
        resource('/big.js', 'script', 900, 0),
        resource('/mid.js', 'script', 500),
      ],
      ORIGIN,
    );

    expect(summary.largest).toEqual([
      { path: '/big.js', decodedBytes: 900, cached: true },
      { path: '/mid.js', decodedBytes: 500, cached: false },
      { path: '/small.js?v=1', decodedBytes: 10, cached: false },
    ]);
  });

  it('keeps at most the shown number of largest entries', () => {
    const entries = Array.from({ length: LARGEST_SHOWN + 3 }, (_, index) =>
      resource(`/m${index}.js`, 'script', index),
    );

    expect(loadSummary(entries, ORIGIN).largest).toHaveLength(LARGEST_SHOWN);
  });
});
