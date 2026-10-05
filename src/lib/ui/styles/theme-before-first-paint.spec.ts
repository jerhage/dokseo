import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const HTML = readFileSync(new URL('../../../app.html', import.meta.url), 'utf8');
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
    new Set(Array.from(THEME.matchAll(/\[data-theme='([\w-]+)'\]/gu), (found) => found[1] ?? '')),
  ).toSorted();
}

describe('the theme script in app.html', () => {
  it.each([
    ['nothing is stored', holding({})],
    [
      'the stored values are unknown',
      holding({ 'reader.theme': 'neon', 'reader.color-scheme': 'auto' }),
    ],
    ['storage refuses to be read', REFUSING],
  ])('applies the base theme and leaves the scheme automatic when %s', (_, storage) => {
    const attributes = run(storage);

    expect(attributes.get('data-theme')).toBe('base');
    expect(attributes.has('data-color-scheme')).toBe(false);
  });

  it.each([
    ['ember', 'dark', { 'reader.theme': 'ember', 'reader.color-scheme': 'dark' }],
    ['base', 'light', { 'reader.color-scheme': 'light' }],
  ])(
    'applies the %s theme and pins the %s scheme from what is stored',
    (theme, scheme, entries) => {
      const attributes = run(holding(entries));

      expect(attributes.get('data-theme')).toBe(theme);
      expect(attributes.get('data-color-scheme')).toBe(scheme);
    },
  );

  it('accepts exactly the themes the stylesheet defines', () => {
    expect(acceptedThemes()).toEqual([
      'base',
      'crayon',
      'ember',
      'forge',
      'mono',
      'moss',
      'petal',
      'yorha',
    ]);
    expect(acceptedThemes()).toEqual(styledThemes());
  });
});
