import { describe, expect, it } from 'vitest';
import { changeMarker, isLaterVersion } from './change-marker';

describe('changeMarker', () => {
  it('mints a new change id for each marker of the same record', () => {
    const first = changeMarker('tag', 't', false, 1);
    const second = changeMarker('tag', 't', false, 1);

    expect(first.changeId).not.toBe(second.changeId);
    expect(first.changeId.length).toBeGreaterThan(0);
  });
});

describe('isLaterVersion', () => {
  it('orders by updatedAt first', () => {
    expect(isLaterVersion({ updatedAt: 2, deviceId: 'a' }, { updatedAt: 1, deviceId: 'z' })).toBe(
      true,
    );
    expect(isLaterVersion({ updatedAt: 1, deviceId: 'z' }, { updatedAt: 2, deviceId: 'a' })).toBe(
      false,
    );
  });

  it('breaks an updatedAt tie by device id compared as lowercase text', () => {
    expect(isLaterVersion({ updatedAt: 1, deviceId: 'B' }, { updatedAt: 1, deviceId: 'a' })).toBe(
      true,
    );
    expect(isLaterVersion({ updatedAt: 1, deviceId: 'a' }, { updatedAt: 1, deviceId: 'B' })).toBe(
      false,
    );
  });

  it('rejects an equal version as later', () => {
    expect(isLaterVersion({ updatedAt: 1, deviceId: 'A' }, { updatedAt: 1, deviceId: 'a' })).toBe(
      false,
    );
  });
});
