import { describe, expect, it } from 'vitest';
import { decideMerge, reduceToWinners } from '$lib/domains/sync/domain/merge';
import type { Change } from '$lib/domains/sync/domain/change';

const DEVICE_A = '00000000-0000-4000-8000-00000000000a';
const DEVICE_B = '00000000-0000-4000-8000-00000000000b';

let counter = 0;

function change(overrides: Partial<Change> = {}): Change {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    kind: 'tag',
    recordId: '00000000-0000-4000-8000-000000000005',
    data: { name: 'grammar' },
    updatedAt: 1000,
    deviceId: DEVICE_A,
    ...overrides,
  };
}

describe('decideMerge', () => {
  it('applies an incoming change when nothing is held locally', () => {
    const incoming = change();
    expect(decideMerge(null, incoming)).toEqual({ kind: 'apply', change: incoming });
  });

  it('applies a later incoming change', () => {
    const incoming = change({ updatedAt: 2000 });
    expect(decideMerge(change(), incoming)).toEqual({ kind: 'apply', change: incoming });
  });

  it('keeps the local change when the incoming one is earlier', () => {
    expect(decideMerge(change({ updatedAt: 2000 }), change())).toEqual({ kind: 'keep-local' });
  });

  it('breaks a timestamp tie toward the greater device id', () => {
    const incoming = change({ deviceId: DEVICE_B });
    expect(decideMerge(change(), incoming)).toEqual({ kind: 'apply', change: incoming });
    expect(decideMerge(change({ deviceId: DEVICE_B }), change())).toEqual({ kind: 'keep-local' });
  });

  it('compares device ids as lowercase text', () => {
    const incoming = change({ deviceId: DEVICE_A.toUpperCase() });
    expect(decideMerge(change({ deviceId: DEVICE_B }), incoming)).toEqual({ kind: 'keep-local' });
  });

  it('applies a later tombstone over a live record', () => {
    const tombstone = change({ updatedAt: 2000, data: null });
    expect(decideMerge(change(), tombstone)).toEqual({ kind: 'apply', change: tombstone });
  });

  it('keeps a live record against an earlier tombstone', () => {
    const live = change({ updatedAt: 2000 });
    expect(decideMerge(live, change({ data: null }))).toEqual({ kind: 'keep-local' });
  });

  it('reports a change already held under the same id', () => {
    const held = change();
    expect(decideMerge(held, { ...held })).toEqual({ kind: 'already-applied' });
  });
});

describe('reduceToWinners', () => {
  it('keeps the winner of several changes to one record, in any order', () => {
    const early = change();
    const late = change({ updatedAt: 3000 });
    const middle = change({ updatedAt: 2000, data: null });
    expect(reduceToWinners([middle, late, early])).toEqual([late]);
    expect(reduceToWinners([early, middle, late])).toEqual([late]);
  });

  it('keeps kinds apart when their record ids match', () => {
    const tag = change({ kind: 'tag' });
    const catalog = change({ kind: 'catalog' });
    expect(reduceToWinners([tag, catalog])).toEqual([tag, catalog]);
  });
});
