import { describe, expect, it } from 'vitest';
import { SKIP_WAITING, isSkipWaiting } from './shell-message';

describe('isSkipWaiting', () => {
  it('recognises the skip-waiting message', () => {
    expect(isSkipWaiting(SKIP_WAITING)).toBe(true);
    expect(isSkipWaiting(structuredClone(SKIP_WAITING))).toBe(true);
  });

  it('rejects anything else a page could post', () => {
    for (const data of [
      null,
      undefined,
      'skip-waiting',
      1,
      {},
      { kind: 'claim' },
      { type: 'SKIP_WAITING' },
    ]) {
      expect(isSkipWaiting(data)).toBe(false);
    }
  });
});
