import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const HTML = readFileSync(new URL('../../app.html', import.meta.url), 'utf8');
const THEMES = new URL('base/themes/', import.meta.url);
const THEME = readdirSync(THEMES)
  .filter((name) => name.endsWith('.css'))
  .map((name) => readFileSync(new URL(name, THEMES), 'utf8'))
  .join('\n');
const SCRIPT = /<script>([\s\S]*?)<\/script>/u.exec(HTML)?.[1] ?? '';

type FakeStorage = { readonly getItem: (key: string) => string | null };

function holding(entries: Readonly<Record<string, string>>): FakeStorage {
  return { getItem: (key) => entries[key] ?? null };
}

const REFUSING: FakeStorage = {
  get getItem(): (key: string) => string | null {
    throw new Error('SecurityError');
  },
};

function run(storage: FakeStorage): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>();
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
    },
  };

  new Function('document', 'localStorage', SCRIPT)(document, storage);
  return attributes;
}

function acceptedThemes(): readonly string[] {
  const list = /const themes = \[([^\]]*)\]/u.exec(SCRIPT)?.[1] ?? '';
  return Array.from(list.matchAll(/'([\w-]+)'/gu), (found) => found[1] ?? '').toSorted();
}

function styledThemes(): readonly string[] {
  return Array.from(
    THEME.matchAll(/\[data-theme='([\w-]+)'\]/gu),
    (found) => found[1] ?? '',
  ).toSorted();
}

describe('the theme script in app.html', () => {
  it('applies the base theme and leaves the scheme automatic when nothing is stored', () => {
    const attributes = run(holding({}));

    expect(attributes.get('data-theme')).toBe('base');
    expect(attributes.has('data-color-scheme')).toBe(false);
  });

  it('applies a stored theme and a stored scheme', () => {
    const attributes = run(holding({ 'reader.theme': 'ember', 'reader.color-scheme': 'dark' }));

    expect(attributes.get('data-theme')).toBe('ember');
    expect(attributes.get('data-color-scheme')).toBe('dark');
  });

  it('pins a stored scheme under the default theme', () => {
    const attributes = run(holding({ 'reader.color-scheme': 'light' }));

    expect(attributes.get('data-theme')).toBe('base');
    expect(attributes.get('data-color-scheme')).toBe('light');
  });

  it('falls back to the defaults for values it does not know', () => {
    const attributes = run(holding({ 'reader.theme': 'neon', 'reader.color-scheme': 'auto' }));

    expect(attributes.get('data-theme')).toBe('base');
    expect(attributes.has('data-color-scheme')).toBe(false);
  });

  it('falls back to the defaults when storage refuses to be read', () => {
    const attributes = run(REFUSING);

    expect(attributes.get('data-theme')).toBe('base');
    expect(attributes.has('data-color-scheme')).toBe(false);
  });

  it('accepts exactly the themes the stylesheet defines', () => {
    expect(acceptedThemes()).toEqual(['base', 'crayon', 'ember', 'forge', 'mono', 'moss']);
    expect(acceptedThemes()).toEqual(styledThemes());
  });
});
