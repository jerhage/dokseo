import { describe, expect, it } from 'vitest';
import { rememberedFlag } from './remembered-flag';

function fakeStorage(entries: Readonly<Record<string, string>> = {}): Storage {
  const held = new Map<string, string>(Object.entries(entries));

  return {
    get length() {
      return held.size;
    },
    clear: () => held.clear(),
    getItem: (key) => held.get(key) ?? null,
    key: (index) => [...held.keys()][index] ?? null,
    removeItem: (key) => void held.delete(key),
    setItem: (key, value) => void held.set(key, value),
  };
}

function brokenStorage(): Storage {
  return {
    ...fakeStorage(),
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
}

describe('rememberedFlag', () => {
  it('reads the value a previous session stored', () => {
    const flag = rememberedFlag('chrome', false, fakeStorage({ chrome: 'true' }));

    expect(flag.value()).toBe(true);
  });

  it('falls back when nothing is stored', () => {
    const flag = rememberedFlag('chrome', false, fakeStorage());

    expect(flag.value()).toBe(false);
  });

  it('prefers a stored false over a true fallback', () => {
    const flag = rememberedFlag('chrome', true, fakeStorage({ chrome: 'false' }));

    expect(flag.value()).toBe(false);
  });

  it('falls back when the stored value is not a flag', () => {
    const flag = rememberedFlag('chrome', true, fakeStorage({ chrome: '"yes"' }));

    expect(flag.value()).toBe(true);
  });

  it('falls back when the stored value is unreadable', () => {
    const flag = rememberedFlag('chrome', true, fakeStorage({ chrome: '{' }));

    expect(flag.value()).toBe(true);
  });

  it('falls back when there is no storage at all', () => {
    const flag = rememberedFlag('chrome', false, null);

    expect(flag.value()).toBe(false);
  });

  it('remembers nothing and stays silent when storage throws', () => {
    const flag = rememberedFlag('chrome', false, brokenStorage());

    expect(flag.set(true)).toBe(true);
  });

  it('carries a raised flag to the next session', () => {
    const storage = fakeStorage();
    rememberedFlag('chrome', false, storage).set(true);

    expect(rememberedFlag('chrome', false, storage).value()).toBe(true);
  });

  it('carries a lowered flag to the next session', () => {
    const storage = fakeStorage({ chrome: 'true' });
    rememberedFlag('chrome', false, storage).set(false);

    expect(rememberedFlag('chrome', true, storage).value()).toBe(false);
  });

  it('reports the value it holds after a change', () => {
    const flag = rememberedFlag('chrome', false, fakeStorage());
    flag.set(true);

    expect(flag.value()).toBe(true);
  });
});
