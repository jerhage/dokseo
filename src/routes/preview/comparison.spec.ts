import { describe, expect, it } from 'vitest';
import { activeComparison, isShowing } from './comparison';
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

describe('activeComparison', () => {
  it('shows exactly one variant on the page each variant links to', () => {
    const variants = activeComparison()?.variants ?? [];
    const shownCounts = variants.map(
      (linked) => variants.filter((variant) => isShowing(variant, linked.href)).length,
    );

    expect(shownCounts.filter((count) => count !== 1)).toEqual([]);
  });
});
