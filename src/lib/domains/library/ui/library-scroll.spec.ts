import { describe, expect, it } from 'vitest';
import { READER_ROUTE, returnsFromReader, scrollStep, scrollTopFrom } from './library-scroll';

describe('scrollTopFrom', () => {
  it('accepts a finite offset of zero or more', () => {
    expect(scrollTopFrom(0)).toBe(0);
    expect(scrollTopFrom(1234.5)).toBe(1234.5);
  });

  it('rejects anything that is not a usable offset', () => {
    expect(scrollTopFrom(-1)).toBeNull();
    expect(scrollTopFrom(Number.NaN)).toBeNull();
    expect(scrollTopFrom(Number.POSITIVE_INFINITY)).toBeNull();
    expect(scrollTopFrom('120')).toBeNull();
    expect(scrollTopFrom(null)).toBeNull();
    expect(scrollTopFrom(undefined)).toBeNull();
  });
});

describe('returnsFromReader', () => {
  it('counts a link followed from the reader as a return', () => {
    expect(returnsFromReader('link', READER_ROUTE)).toBe(true);
  });

  it('leaves out a link from any other page, and every other kind of navigation', () => {
    expect(returnsFromReader('link', '/settings')).toBe(false);
    expect(returnsFromReader('link', null)).toBe(false);
    expect(returnsFromReader('popstate', READER_ROUTE)).toBe(false);
    expect(returnsFromReader('goto', READER_ROUTE)).toBe(false);
    expect(returnsFromReader('enter', null)).toBe(false);
  });
});

describe('scrollStep', () => {
  it('waits while the library is still being read', () => {
    expect(scrollStep(480, 'reading')).toEqual({ kind: 'wait' });
  });

  it('scrolls to the pending offset once the books are listed', () => {
    expect(scrollStep(480, 'listed')).toEqual({ kind: 'scroll', top: 480 });
  });

  it('gives up on the offset when there is nothing to scroll to', () => {
    expect(scrollStep(480, 'empty')).toEqual({ kind: 'none' });
    expect(scrollStep(480, 'failed')).toEqual({ kind: 'none' });
  });

  it('does nothing when no offset is pending', () => {
    expect(scrollStep(null, 'listed')).toEqual({ kind: 'none' });
    expect(scrollStep(null, 'reading')).toEqual({ kind: 'none' });
  });
});
