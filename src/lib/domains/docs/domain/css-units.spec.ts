import { describe, expect, it } from 'vitest';
import { remPixels } from './css-units';

describe('remPixels', () => {
  it('multiplies a rem length by the root font size', () => {
    expect(remPixels('48rem', 16)).toBe(768);
    expect(remPixels(' 43.75rem', 16)).toBe(700);
  });

  it('returns null for any other unit or text', () => {
    expect(remPixels('48em', 16)).toBeNull();
    expect(remPixels('', 16)).toBeNull();
    expect(remPixels('48rem', Number.NaN)).toBeNull();
  });
});
