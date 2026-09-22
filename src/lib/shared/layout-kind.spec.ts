import { describe, expect, it } from 'vitest';
import { effectiveDirection, effectivePairing, imageLayoutKind } from './layout-kind';

describe('imageLayoutKind', () => {
  it('answers with the layout kind of a book made of images', () => {
    expect(imageLayoutKind('paged')).toBe('paged');
    expect(imageLayoutKind('continuous')).toBe('continuous');
  });

  it('answers nothing for a book that reflows its text', () => {
    expect(imageLayoutKind('flow')).toBeNull();
  });
});

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

  it('keeps the direction a flow book declares, because its text runs that way', () => {
    expect(effectiveDirection('rtl', 'flow')).toBe('rtl');
    expect(effectiveDirection('ltr', 'flow')).toBe('ltr');
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
