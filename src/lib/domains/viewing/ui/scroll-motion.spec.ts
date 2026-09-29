import { describe, expect, it } from 'vitest';
import { scrollMotion } from './scroll-motion';

describe('scrollMotion', () => {
  it('jumps when the system asks for reduced motion', () => {
    expect(scrollMotion(true)).toBe('instant');
  });

  it('scrolls smoothly when the system does not ask for reduced motion', () => {
    expect(scrollMotion(false)).toBe('smooth');
  });
});
