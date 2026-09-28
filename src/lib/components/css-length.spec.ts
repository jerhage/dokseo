import { describe, expect, it } from 'vitest';
import { pixelLength } from './css-length';

function styleWith(values: Readonly<Record<string, string>>) {
  return { getPropertyValue: (property: string) => values[property] ?? '' };
}

describe('pixelLength', () => {
  it('reads the pixels a registered length computes to', () => {
    expect(pixelLength(styleWith({ '--gap': '16px' }), '--gap')).toBe(16);
  });

  it('reads a fractional length', () => {
    expect(pixelLength(styleWith({ '--gap': ' 12.5px' }), '--gap')).toBe(12.5);
  });

  it('reads 0 for a property nothing sets', () => {
    expect(pixelLength(styleWith({}), '--gap')).toBe(0);
  });
});
