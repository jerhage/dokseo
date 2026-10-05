import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES } from './appearance';
import { themeBootScript } from './theme-boot';

const KEYS = { themeKey: 'app.theme', schemeKey: 'app.scheme' };

const THEME_SHEETS = new URL('./styles/base/themes/', import.meta.url);

type FakeStorage = { readonly getItem: (key: string) => string | null };

function holding(entries: Readonly<Record<string, string>>): FakeStorage {
  return { getItem: (key) => entries[key] ?? null };
}

const REFUSING: FakeStorage = {
  get getItem(): (key: string) => string | null {
    throw new Error('SecurityError');
  },
};

function run(script: string, storage: FakeStorage): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>();
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
    },
  };

  new Function('document', 'localStorage', script)(document, storage);
  return attributes;
}

function acceptedThemes(script: string): readonly string[] {
  const list = /const themes = \[([^\]]*)\]/u.exec(script)?.[1] ?? '';
  return Array.from(list.matchAll(/'([\w-]+)'/gu), (found) => found[1] ?? '').toSorted();
}

function styledThemes(): readonly string[] {
  const sheets = readdirSync(THEME_SHEETS)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(new URL(name, THEME_SHEETS), 'utf8'))
    .join('\n');
  return Array.from(
    new Set(Array.from(sheets.matchAll(/\[data-theme='([\w-]+)'\]/gu), (found) => found[1] ?? '')),
  ).toSorted();
}

describe('themeBootScript', () => {
  it('returns a script that parses as JavaScript', () => {
    expect(() => new Function(themeBootScript(KEYS))).not.toThrow();
  });

  it.each([
    ['nothing is stored', holding({})],
    ['the stored values are unknown', holding({ 'app.theme': 'neon', 'app.scheme': 'auto' })],
    ['storage refuses to be read', REFUSING],
  ])('applies the base theme and leaves the scheme automatic when %s', (_, storage) => {
    const attributes = run(themeBootScript(KEYS), storage);

    expect(attributes.get('data-theme')).toBe('base');
    expect(attributes.has('data-color-scheme')).toBe(false);
  });

  it.each([
    ['ember', 'dark', { 'app.theme': 'ember', 'app.scheme': 'dark' }],
    ['base', 'light', { 'app.scheme': 'light' }],
  ])(
    'applies the %s theme and pins the %s scheme from what is stored',
    (theme, scheme, entries) => {
      const attributes = run(themeBootScript(KEYS), holding(entries));

      expect(attributes.get('data-theme')).toBe(theme);
      expect(attributes.get('data-color-scheme')).toBe(scheme);
    },
  );

  it('reads only the keys it is given', () => {
    const stored = holding({ 'app.theme': 'moss', 'other.theme': 'petal', 'other.scheme': 'dark' });
    const attributes = run(themeBootScript(KEYS), stored);

    expect(attributes.get('data-theme')).toBe('moss');
    expect(attributes.has('data-color-scheme')).toBe(false);
  });

  it('reads a key that holds a quote or a backslash', () => {
    const keys = { themeKey: "it's\\theme", schemeKey: 'scheme' };
    const attributes = run(themeBootScript(keys), holding({ "it's\\theme": 'forge' }));

    expect(attributes.get('data-theme')).toBe('forge');
  });

  it('accepts exactly THEMES, which are the themes the stylesheets define', () => {
    const accepted = acceptedThemes(themeBootScript(KEYS));

    expect(accepted).toEqual(THEMES.toSorted());
    expect(accepted).toEqual(styledThemes());
  });
});
