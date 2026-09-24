import { describe, expect, it } from 'vitest';
import { progressPercent } from './progress';

describe('progressPercent', () => {
  it('scales a value against its maximum', () => {
    expect(progressPercent(3, 12)).toBe(25);
  });

  it('holds a value above the maximum at a full bar', () => {
    expect(progressPercent(140, 100)).toBe(100);
  });

  it('holds a negative value at an empty bar', () => {
    expect(progressPercent(-5, 100)).toBe(0);
  });

  it('reports an empty bar for a maximum of zero', () => {
    expect(progressPercent(5, 0)).toBe(0);
  });

  it('reports an empty bar for a value that is not a number', () => {
    expect(progressPercent(Number.NaN, 100)).toBe(0);
  });
});
