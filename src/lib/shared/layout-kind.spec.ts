import { describe, expect, it } from 'vitest';
import { effectiveDirection, effectivePairing, imageLayoutKind } from './layout-kind';

describe('imageLayoutKind', () => {
  it.each([
    ['paged', 'paged'],
    ['continuous', 'continuous'],
    ['flow', null],
  ] as const)('answers a book of layout %s with the image layout kind %s', (kind, image) => {
    expect(imageLayoutKind(kind)).toBe(image);
  });
});

describe('effectiveDirection', () => {
  it.each([
    ['rtl', 'paged', 'rtl'],
    ['ltr', 'paged', 'ltr'],
    ['rtl', 'continuous', 'ltr'],
    ['ltr', 'continuous', 'ltr'],
    ['rtl', 'flow', 'rtl'],
    ['ltr', 'flow', 'ltr'],
  ] as const)('reads a %s book of layout %s as %s', (direction, kind, effective) => {
    expect(effectiveDirection(direction, kind)).toBe(effective);
  });
});

describe('effectivePairing', () => {
  it.each([
    ['double', 'paged', 'double'],
    ['double-after-cover', 'paged', 'double-after-cover'],
    ['single', 'paged', 'single'],
    ['double', 'continuous', 'single'],
    ['double-after-cover', 'continuous', 'single'],
    ['single', 'continuous', 'single'],
    ['auto', 'paged', 'double-after-cover'],
    ['auto', 'continuous', 'single'],
  ] as const)('pairs a book asking for %s in layout %s as %s', (pairing, kind, effective) => {
    expect(effectivePairing(pairing, kind, 'wide')).toBe(effective);
  });

  it.each([
    ['auto', 'paged', 'single'],
    ['double', 'paged', 'double'],
    ['double-after-cover', 'paged', 'double-after-cover'],
    ['single', 'paged', 'single'],
    ['auto', 'continuous', 'single'],
  ] as const)(
    'pairs a book asking for %s in layout %s as %s on a narrow screen',
    (pairing, kind, effective) => {
      expect(effectivePairing(pairing, kind, 'narrow')).toBe(effective);
    },
  );
});
