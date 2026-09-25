import { describe, expect, it } from 'vitest';
import { activeComparison, isShowing, routeParameters, variantHref } from './comparison';
import type { Variant } from './comparison';

const A: Variant = { label: 'A', route: '/preview/a/settings/storage', within: '/preview/a' };
const CURRENT: Variant = { label: 'Current', route: '/settings/storage', within: null };
const READER_A: Variant = { label: 'A', route: '/preview/a/read/[fileId]', within: '/preview/a' };
const READER: Variant = { label: 'Current', route: '/read/[fileId]', within: null };

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

  it('matches a parameter segment of a variant with no root against any one segment', () => {
    expect(isShowing(READER, '/read/book-1')).toBe(true);
    expect(isShowing(READER, '/read/')).toBe(false);
    expect(isShowing(READER, '/read/book-1/more')).toBe(false);
    expect(isShowing(READER, '/preview/a/read/book-1')).toBe(false);
  });
});

describe('variantHref', () => {
  it('links a route with no parameters to itself, with the search kept', () => {
    expect(variantHref(CURRENT, {}, '?x=1')).toBe('/settings/storage?x=1');
  });

  it('fills each parameter from the page and keeps the query, so a switch stays on the same book and page', () => {
    expect(variantHref(READER_A, { fileId: 'book-1' }, '?image=12')).toBe(
      '/preview/a/read/book-1?image=12',
    );
    expect(variantHref(READER, { fileId: 'book-1' }, '?image=12')).toBe('/read/book-1?image=12');
  });

  it('encodes a parameter value as one path segment', () => {
    expect(variantHref(READER, { fileId: 'a/b c' })).toBe('/read/a%2Fb%20c');
  });

  it('gives no link when the page lacks a parameter the route needs', () => {
    expect(variantHref(READER_A, {})).toBeNull();
    expect(variantHref(READER_A, { fileId: '' })).toBeNull();
  });
});

describe('routeParameters', () => {
  it('names the parameters a route needs, in order', () => {
    expect(routeParameters('/preview/a/read/[fileId]')).toEqual(['fileId']);
    expect(routeParameters('/settings/storage')).toEqual([]);
  });
});

describe('activeComparison', () => {
  it('shows exactly one variant on the page each variant links to', () => {
    const variants = activeComparison()?.variants ?? [];
    const shownCounts = variants.map((linked) => {
      const href = variantHref(linked, { fileId: 'book-1' }) ?? '';
      return variants.filter((variant) => isShowing(variant, href)).length;
    });

    expect(shownCounts.filter((count) => count !== 1)).toEqual([]);
  });

  it('keeps the book of the page in every variant link', () => {
    const variants = activeComparison()?.variants ?? [];
    const hrefs = variants.map((variant) => variantHref(variant, { fileId: 'book-1' }, '?image=3'));

    expect(hrefs).toEqual([
      '/read/book-1?image=3',
      '/preview/a/read/book-1?image=3',
      '/preview/b/read/book-1?image=3',
    ]);
  });
});
