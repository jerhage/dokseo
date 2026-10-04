import { describe, expect, it } from 'vitest';
import { MANGA_OCR_INPUT, factorText, sizeText, squashInto } from './ocr-crop';

describe('squashInto', () => {
  it('reports how far each axis stretches to reach the model input', () => {
    expect(squashInto({ width: 448, height: 112 }, MANGA_OCR_INPUT)).toEqual({
      across: 0.5,
      down: 2,
    });
  });
});

describe('sizeText', () => {
  it('writes the width before the height', () => {
    expect(sizeText({ width: 279, height: 384 })).toBe('279 × 384');
  });
});

describe('factorText', () => {
  it('writes a factor to two decimals', () => {
    expect(factorText(0.5)).toBe('× 0.50');
  });
});
