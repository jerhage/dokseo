import { describe, expect, it } from 'vitest';
import { COMPARISON, isShowing } from './comparison';
import type { Variant } from './comparison';

const A: Variant = { label: 'A', href: '/preview/a/settings/storage', within: '/preview/a' };
const CURRENT: Variant = { label: 'Current', href: '/settings/storage', within: null };

describe('isShowing', () => {
  it('marks a variant shown on every page beneath its root', () => {
    expect(isShowing(A, '/preview/a/settings')).toBe(true);
    expect(isShowing(A, '/preview/a/settings/storage')).toBe(true);
    expect(isShowing(A, '/preview/a')).toBe(true);
  });

  it('refuses a path that only shares the root as a prefix', () => {
    expect(isShowing(A, '/preview/ab/settings')).toBe(false);
    expect(isShowing(A, '/preview/b/settings')).toBe(false);
  });

  it('matches a variant with no root by its exact link', () => {
    expect(isShowing(CURRENT, '/settings/storage')).toBe(true);
    expect(isShowing(CURRENT, '/settings')).toBe(false);
  });
});

describe('COMPARISON', () => {
  it('shows exactly one variant on each preview page', () => {
    for (const pathname of ['/preview/a/settings', '/preview/b/settings/storage']) {
      const shown = COMPARISON.variants.filter((variant) => isShowing(variant, pathname));

      expect(shown).toHaveLength(1);
    }
  });
});
