import { describe, expect, it } from 'vitest';
import { effectiveDirection, effectivePairing } from './layout-kind';

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

describe('effectivePairing', () => {
  it('pairs a paged book the way the book asks', () => {
    expect(effectivePairing('double', 'paged')).toBe('double');
    expect(effectivePairing('double-after-cover', 'paged')).toBe('double-after-cover');
    expect(effectivePairing('single', 'paged')).toBe('single');
  });

  it('leaves a strip unpaired whatever the book says', () => {
    expect(effectivePairing('double', 'continuous')).toBe('single');
    expect(effectivePairing('double-after-cover', 'continuous')).toBe('single');
    expect(effectivePairing('single', 'continuous')).toBe('single');
  });
});
