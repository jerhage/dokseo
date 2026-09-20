import { describe, expect, it } from 'vitest';
import { mostLikelyToken, type DecoderLogits } from './most-likely-token';

function logitsOf(positions: number[][]): DecoderLogits {
  const vocabulary = positions[0]?.length ?? 0;
  return {
    dims: [1, positions.length, vocabulary],
    data: Float32Array.from(positions.flat()),
  };
}

describe('mostLikelyToken', () => {
  it('picks the highest scoring token', () => {
    expect(mostLikelyToken(logitsOf([[0.1, 0.9, 0.4]]))).toBe(1);
  });

  it('reads the last position and ignores every earlier one', () => {
    const logits = logitsOf([
      [9, 0, 0],
      [0, 9, 0],
      [0, 0, 9],
    ]);

    expect(mostLikelyToken(logits)).toBe(2);
  });

  it('keeps the first token when the scores tie', () => {
    expect(mostLikelyToken(logitsOf([[0.5, 0.5, 0.5]]))).toBe(0);
  });
});
