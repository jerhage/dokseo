import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { COLOR_SCHEMES, THEMES, readAppearance } from './appearance';
import type { Appearance, RootAttributes } from './appearance';
import { SCHEME_KEY, THEME_KEY, chooseAppearance } from './saved-appearance';

const HTML = readFileSync(new URL('../../app.html', import.meta.url), 'utf8');
const SCRIPT = /<script>([\s\S]*?)<\/script>/u.exec(HTML)?.[1] ?? '';

class FakeStore implements StringStore {
  readonly entries = new Map<string, string>();

  constructor(initial: Readonly<Record<string, string>> = {}) {
    for (const [key, value] of Object.entries(initial)) this.entries.set(key, value);
  }

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

class FakeRoot implements RootAttributes {
  readonly attributes = new Map<string, string>();

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

function prePaint(store: StringStore): FakeRoot {
  const root = new FakeRoot();
  new Function('document', 'localStorage', SCRIPT)({ documentElement: root }, store);
  return root;
}

const EVERY_APPEARANCE: readonly Appearance[] = THEMES.flatMap((theme) =>
  COLOR_SCHEMES.map((colorScheme) => ({ theme, colorScheme })),
);

describe('chooseAppearance', () => {
  it('applies the choice to the root', () => {
    const root = new FakeRoot();

    chooseAppearance(root, { theme: 'ember', colorScheme: 'dark' }, () => new FakeStore());

    expect(readAppearance(root)).toEqual({ theme: 'ember', colorScheme: 'dark' });
  });

  it('stores the theme and a pinned scheme under the keys the pre-paint script reads', () => {
    const store = new FakeStore();

    chooseAppearance(new FakeRoot(), { theme: 'moss', colorScheme: 'light' }, () => store);

    expect(Object.fromEntries(store.entries)).toEqual({
      [THEME_KEY]: 'moss',
      [SCHEME_KEY]: 'light',
    });
  });

  it('removes the stored scheme for automatic and writes nothing in its place', () => {
    const store = new FakeStore({ [THEME_KEY]: 'ember', [SCHEME_KEY]: 'dark' });

    chooseAppearance(new FakeRoot(), { theme: 'ember', colorScheme: 'automatic' }, () => store);

    expect(Object.fromEntries(store.entries)).toEqual({ [THEME_KEY]: 'ember' });
  });

  it('still applies the choice when storage refuses every call', () => {
    const root = new FakeRoot();
    const unreachable = (): StringStore => {
      throw new Error('SecurityError');
    };

    chooseAppearance(root, { theme: 'forge', colorScheme: 'light' }, unreachable);

    expect(readAppearance(root)).toEqual({ theme: 'forge', colorScheme: 'light' });
  });

  it('saves every choice so that the pre-paint script restores it after a reload', () => {
    for (const appearance of EVERY_APPEARANCE) {
      const store = new FakeStore({ [SCHEME_KEY]: 'dark' });

      chooseAppearance(new FakeRoot(), appearance, () => store);

      expect(readAppearance(prePaint(store))).toEqual(appearance);
    }
  });
});
