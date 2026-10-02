import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuideKind } from './guide-kind';

const KEY = 'reader.touch.guides-seen';

class FakeStorage {
  readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

let storage = new FakeStorage();

beforeAll(async () => {
  vi.stubGlobal('localStorage', new FakeStorage());
  await import('./seen-guides.svelte');
  vi.unstubAllGlobals();
}, 30_000);

beforeEach(() => {
  storage = new FakeStorage();
  vi.stubGlobal('localStorage', storage);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the seen guides', () => {
  it('reports every kind unseen on a first visit', async () => {
    const guides = await import('./seen-guides.svelte');

    expect(guides.guideSeen('swipe-left')).toBe(false);
    expect(guides.guideSeen('vertical-pages')).toBe(false);
  });

  it('marks only the kind that was dismissed', async () => {
    const guides = await import('./seen-guides.svelte');

    guides.markGuideSeen('swipe-right');

    expect(guides.guideSeen('swipe-right')).toBe(true);
    expect(guides.guideSeen('swipe-left')).toBe(false);
    expect(guides.guideSeen('tap-zones')).toBe(false);
  });

  it('remembers the seen kinds under one key for the next visit', async () => {
    const first = await import('./seen-guides.svelte');
    first.markGuideSeen('strip-scroll');
    first.markGuideSeen('tap-zones');

    vi.resetModules();
    const next = await import('./seen-guides.svelte');

    expect(JSON.parse(storage.entries.get(KEY) ?? '[]')).toEqual(['strip-scroll', 'tap-zones']);
    expect(next.guideSeen('strip-scroll')).toBe(true);
    expect(next.guideSeen('tap-zones')).toBe(true);
  });

  it('ignores a kind a stale store holds, on the first read and after a mark', async () => {
    storage.setItem(KEY, JSON.stringify(['zones', 'swipe-left']));
    const guides = await import('./seen-guides.svelte');
    const stale = 'zones' as GuideKind;
    const read = [guides.guideSeen(stale), guides.guideSeen('swipe-left')];

    guides.markGuideSeen('tap-zones');

    expect([...read, guides.guideSeen(stale), guides.guideSeen('tap-zones')]).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });
});
