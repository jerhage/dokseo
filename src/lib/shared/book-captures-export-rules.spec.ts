import { describe, expect, it } from 'vitest';
import { exportOffer, savedCapturesText } from './book-captures-export-rules';

describe('exportOffer', () => {
  it('offers nothing while the file is being prepared', () => {
    expect(exportOffer({ kind: 'preparing' })).toEqual({ kind: 'none' });
  });
});

describe('savedCapturesText', () => {
  it.each([
    [1, 'Saved 1 capture.'],
    [2, 'Saved 2 captures.'],
  ])('reports %i as %j', (count, text) => {
    expect(savedCapturesText(count)).toBe(text);
  });
});
