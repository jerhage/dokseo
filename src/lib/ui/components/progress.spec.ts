import { describe, expect, it } from 'vitest';
import { progressPercent } from './progress';

describe('progressPercent', () => {
  it('scales a value against its maximum', () => {
    expect(progressPercent(3, 12)).toBe(25);
  });

  it.each([
    ['a value above the maximum at a full bar', 140, 100],
    ['a negative value at an empty bar', -5, 0],
  ])('holds %s', (_case, value, percent) => {
    expect(progressPercent(value, 100)).toBe(percent);
  });

  it.each([
    ['a maximum of zero', 5, 0],
    ['a value that is not a number', Number.NaN, 100],
  ])('reports an empty bar for %s', (_case, value, maximum) => {
    expect(progressPercent(value, maximum)).toBe(0);
  });
});
