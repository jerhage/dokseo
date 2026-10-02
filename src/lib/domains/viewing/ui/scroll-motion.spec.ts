import { describe, expect, it } from 'vitest';
import { scrollMotion } from './scroll-motion';

describe('scrollMotion', () => {
  it.each([
    { reduced: true, motion: 'instant' },
    { reduced: false, motion: 'smooth' },
  ])('answers $motion when reduced motion is $reduced', ({ reduced, motion }) => {
    expect(scrollMotion(reduced)).toBe(motion);
  });
});
