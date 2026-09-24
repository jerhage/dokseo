import { describe, expect, it } from 'vitest';
import { rememberedString } from './remembered-string';
import type { StringStore } from './remembered-string';

class FakeStore implements StringStore {
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

class RefusingStore implements StringStore {
  getItem(): string | null {
    throw new Error('SecurityError');
  }

  setItem(): void {
    throw new Error('QuotaExceededError');
  }

  removeItem(): void {
    throw new Error('SecurityError');
  }
}

describe('rememberedString', () => {
  it('reads the value stored under its key', () => {
    const store = new FakeStore();
    store.setItem('reader.theme', 'ember');
    store.setItem('reader.other', 'moss');

    expect(rememberedString('reader.theme', () => store).read()).toBe('ember');
  });

  it('reports null when nothing is stored', () => {
    expect(rememberedString('reader.theme', () => new FakeStore()).read()).toBeNull();
  });

  it('writes the value under its key and touches no other', () => {
    const store = new FakeStore();
    store.setItem('reader.other', 'moss');

    rememberedString('reader.theme', () => store).write('forge');

    expect([...store.entries]).toEqual([
      ['reader.other', 'moss'],
      ['reader.theme', 'forge'],
    ]);
  });

  it('removes its key on forget and leaves the others', () => {
    const store = new FakeStore();
    store.setItem('reader.theme', 'ember');
    store.setItem('reader.other', 'moss');

    rememberedString('reader.theme', () => store).forget();

    expect([...store.entries]).toEqual([['reader.other', 'moss']]);
  });

  it('reads null and swallows writes when the store refuses every call', () => {
    const remembered = rememberedString('reader.theme', () => new RefusingStore());

    expect(remembered.read()).toBeNull();
    expect(() => remembered.write('ember')).not.toThrow();
    expect(() => remembered.forget()).not.toThrow();
  });

  it('reads null and swallows writes when the store cannot be reached', () => {
    const unreachable = (): StringStore => {
      throw new Error('SecurityError');
    };
    const remembered = rememberedString('reader.theme', unreachable);

    expect(remembered.read()).toBeNull();
    expect(() => remembered.write('ember')).not.toThrow();
    expect(() => remembered.forget()).not.toThrow();
  });

  it('does nothing when there is no store', () => {
    const remembered = rememberedString('reader.theme', () => null);

    expect(remembered.read()).toBeNull();
    expect(() => remembered.write('ember')).not.toThrow();
    expect(() => remembered.forget()).not.toThrow();
  });
});
