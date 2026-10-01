import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeAll(async () => {
  vi.stubGlobal('localStorage', new FakeStorage());
  await import('./all-captures.svelte');
  vi.unstubAllGlobals();
}, 30_000);

beforeEach(() => {
  vi.stubGlobal('localStorage', new FakeStorage());
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chooseAllCaptures', () => {
  it('shows every capture once chosen, and remembers it for the next visit', async () => {
    const first = await import('./all-captures.svelte');
    first.chooseAllCaptures(true);

    vi.resetModules();
    const next = await import('./all-captures.svelte');

    expect([first.allCapturesWanted(), next.allCapturesWanted()]).toEqual([true, true]);
  });
});
