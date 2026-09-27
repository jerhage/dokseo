import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'reader.gestures.learned';

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
  await import('./learned-gestures.svelte');
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

describe('forgetGestures', () => {
  it('empties the learned gestures', async () => {
    const gestures = await import('./learned-gestures.svelte');
    gestures.learnGesture('swipe');
    gestures.learnGesture('select');

    gestures.forgetGestures();

    expect(gestures.learnedGestures()).toEqual([]);
  });

  it('removes the remembered gestures, so the next visit teaches them all again', async () => {
    const first = await import('./learned-gestures.svelte');
    first.learnGesture('pinch');
    first.forgetGestures();

    vi.resetModules();
    const next = await import('./learned-gestures.svelte');

    expect(storage.entries.has(KEY)).toBe(false);
    expect(next.learnedGestures()).toEqual([]);
  });

  it('learns a gesture again after forgetting', async () => {
    const gestures = await import('./learned-gestures.svelte');
    gestures.learnGesture('pinch');
    gestures.forgetGestures();

    gestures.learnGesture('pinch');

    expect(gestures.learnedGestures()).toEqual(['pinch']);
  });
});

describe('chooseHints', () => {
  it('forgets the learned gestures and the seen zone overlay when turned back on', async () => {
    storage.setItem('reader.touch.zones-seen', 'seen');
    const gestures = await import('./learned-gestures.svelte');
    const zones = await import('./zones-seen.svelte');
    gestures.learnGesture('swipe');

    gestures.chooseHints(false);
    gestures.chooseHints(true);

    expect(gestures.learnedGestures()).toEqual([]);
    expect(zones.zonesSeen()).toBe(false);
    expect(storage.entries.has('reader.touch.zones-seen')).toBe(false);
    expect(gestures.hintsWanted()).toBe(true);
  });

  it('keeps the learned gestures when turned off', async () => {
    const gestures = await import('./learned-gestures.svelte');
    gestures.learnGesture('swipe');

    gestures.chooseHints(false);

    expect(gestures.learnedGestures()).toEqual(['swipe']);
    expect(gestures.hintsWanted()).toBe(false);
  });

  it('keeps the learned gestures when chosen on while already on', async () => {
    storage.setItem('reader.touch.zones-seen', 'seen');
    const gestures = await import('./learned-gestures.svelte');
    const zones = await import('./zones-seen.svelte');
    gestures.learnGesture('swipe');

    gestures.chooseHints(true);

    expect(gestures.learnedGestures()).toEqual(['swipe']);
    expect(zones.zonesSeen()).toBe(true);
  });

  it('remembers off for the next visit', async () => {
    const first = await import('./learned-gestures.svelte');
    first.chooseHints(false);

    vi.resetModules();
    const next = await import('./learned-gestures.svelte');

    expect(next.hintsWanted()).toBe(false);
  });
});
