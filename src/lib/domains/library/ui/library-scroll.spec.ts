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
  it.each([
    { body: 'reading', step: { kind: 'wait' } },
    { body: 'listed', step: { kind: 'scroll', top: 480 } },
    { body: 'empty', step: { kind: 'none' } },
    { body: 'failed', step: { kind: 'none' } },
  ] as const)(
    'answers $step.kind for a pending offset while the library is $body',
    ({ body, step }) => {
      expect(scrollStep(480, body)).toEqual(step);
    },
  );

  it('does nothing when no offset is pending', () => {
    expect(scrollStep(null, 'listed')).toEqual({ kind: 'none' });
    expect(scrollStep(null, 'reading')).toEqual({ kind: 'none' });
  });
});
