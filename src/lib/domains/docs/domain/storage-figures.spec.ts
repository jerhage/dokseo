import { describe, expect, it } from 'vitest';
import {
  holdsGrant,
  persistOutcome,
  persistOutcomeText,
  quotaShare,
  spaceFigure,
} from './storage-figures';

describe('quotaShare', () => {
  it.each([
    { usage: 0, quota: 1_000, share: '0%' },
    { usage: 1, quota: 1_000_000, share: '0.0001%' },
    { usage: 4, quota: 1_000, share: '0.4%' },
    { usage: 250, quota: 1_000, share: '25%' },
    { usage: 1_000, quota: 1_000, share: '100%' },
  ])('reports $usage of $quota as $share', ({ usage, quota, share }) => {
    expect(quotaShare(usage, quota)).toBe(share);
  });

  it('reports no quota rather than dividing by zero', () => {
    expect(quotaShare(10, 0)).toBe('no quota reported');
  });
});

describe('spaceFigure', () => {
  it.each([
    { bytes: 512, figure: '512 bytes' },
    { bytes: 48_400, figure: '48 kB' },
    { bytes: 231_500_000, figure: '231.5 MB' },
    { bytes: 299_000_000_000, figure: '299.0 GB' },
  ])('writes $bytes bytes as $figure', ({ bytes, figure }) => {
    expect(spaceFigure(bytes)).toBe(figure);
  });
});

describe('persistOutcome', () => {
  it.each([
    { before: null, after: null, kind: 'unsupported' },
    { before: false, after: null, kind: 'unsupported' },
    { before: true, after: true, kind: 'already-granted' },
    { before: false, after: true, kind: 'granted' },
    { before: false, after: false, kind: 'refused' },
  ] as const)('names a request from $before to $after as $kind', ({ before, after, kind }) => {
    expect(persistOutcome(before, after).kind).toBe(kind);
  });
});

describe('holdsGrant', () => {
  it.each([
    { kind: 'unsupported', held: false },
    { kind: 'already-granted', held: true },
    { kind: 'granted', held: true },
    { kind: 'refused', held: false },
  ] as const)('reports $kind as holding the grant: $held', ({ kind, held }) => {
    expect(holdsGrant({ kind })).toBe(held);
  });
});

describe('persistOutcomeText', () => {
  it('names the engagement heuristic when the request is refused', () => {
    expect(persistOutcomeText({ kind: 'refused' })).toContain('how this site has been used');
  });

  it('says a granted origin is no longer evicted under pressure', () => {
    expect(persistOutcomeText({ kind: 'granted' })).toContain('will not evict');
  });
});
