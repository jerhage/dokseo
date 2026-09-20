import { describe, expect, it } from 'vitest';
import { effectiveDirection } from './layout-kind';

describe('effectiveDirection', () => {
  it('reads a paged right-to-left book right to left', () => {
    expect(effectiveDirection('rtl', 'paged')).toBe('rtl');
  });

  it('reads a strip left to right whatever the book says', () => {
    expect(effectiveDirection('rtl', 'continuous')).toBe('ltr');
    expect(effectiveDirection('ltr', 'continuous')).toBe('ltr');
  });

  it('reads a paged left-to-right book left to right', () => {
    expect(effectiveDirection('ltr', 'paged')).toBe('ltr');
  });
});
