import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { THEMES } from './appearance.js';
import { themeBootScript } from './theme-boot.js';

const KEYS = { themeKey: 'app.theme', schemeKey: 'app.scheme' };

const THEME_SHEETS = new URL('./styles/base/themes/', import.meta.url);

/** @typedef {{ readonly getItem: (key: string) => string | null }} FakeStorage */

/**
 * @param {Readonly<Record<string, string>>} entries
 * @returns {FakeStorage}
 */
function holding(entries) {
  return { getItem: (key) => entries[key] ?? null };
}

/** @type {FakeStorage} */
const REFUSING = {
  /** @returns {(key: string) => string | null} */
  get getItem() {
    throw new Error('SecurityError');
  },
};

/**
 * @param {string} script
 * @param {FakeStorage} storage
 * @returns {ReadonlyMap<string, string>}
 */
function run(script, storage) {
  /** @type {Map<string, string>} */
  const attributes = new Map();
  const document = {
    documentElement: {
      /**
       * @param {string} name
       * @param {string} value
       */
      setAttribute: (name, value) => attributes.set(name, value),
    },
  };

  new Function('document', 'localStorage', script)(document, storage);
  return attributes;
}

/**
 * @param {string} script
 * @returns {readonly string[]}
 */
function acceptedThemes(script) {
  const list = /const themes = \[([^\]]*)\]/u.exec(script)?.[1] ?? '';
  return Array.from(list.matchAll(/'([\w-]+)'/gu), (found) => found[1] ?? '').toSorted();
}

/** @returns {readonly string[]} */
function styledThemes() {
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
    assert.doesNotThrow(() => new Function(themeBootScript(KEYS)));
  });

  for (const [name, storage] of /** @type {const} */ ([
    ['nothing is stored', holding({})],
    ['the stored values are unknown', holding({ 'app.theme': 'neon', 'app.scheme': 'auto' })],
    ['storage refuses to be read', REFUSING],
  ])) {
    it(`applies the base theme and leaves the scheme automatic when ${name}`, () => {
      const attributes = run(themeBootScript(KEYS), storage);

      assert.equal(attributes.get('data-theme'), 'base');
      assert.equal(attributes.has('data-color-scheme'), false);
    });
  }

  for (const [theme, scheme, entries] of /** @type {const} */ ([
    ['ember', 'dark', { 'app.theme': 'ember', 'app.scheme': 'dark' }],
    ['base', 'light', { 'app.scheme': 'light' }],
  ])) {
    it(`applies the ${theme} theme and pins the ${scheme} scheme from what is stored`, () => {
      const attributes = run(themeBootScript(KEYS), holding(entries));

      assert.equal(attributes.get('data-theme'), theme);
      assert.equal(attributes.get('data-color-scheme'), scheme);
    });
  }

  it('reads only the keys it is given', () => {
    const stored = holding({ 'app.theme': 'moss', 'other.theme': 'petal', 'other.scheme': 'dark' });
    const attributes = run(themeBootScript(KEYS), stored);

    assert.equal(attributes.get('data-theme'), 'moss');
    assert.equal(attributes.has('data-color-scheme'), false);
  });

  it('reads a key that holds a quote or a backslash', () => {
    const keys = { themeKey: "it's\\theme", schemeKey: 'scheme' };
    const attributes = run(themeBootScript(keys), holding({ "it's\\theme": 'forge' }));

    assert.equal(attributes.get('data-theme'), 'forge');
  });

  it('returns, byte for byte, the script a page hashes for its content security policy', () => {
    assert.equal(
      themeBootScript(KEYS),
      [
        '{',
        "  const themes = ['base', 'petal', 'yorha', 'crayon', 'ember', 'mono', 'forge', 'moss'];",
        "  const schemes = ['light', 'dark'];",
        "  let theme = 'base';",
        '  let scheme = null;',
        '  try {',
        "    const storedTheme = localStorage.getItem('app.theme');",
        "    const storedScheme = localStorage.getItem('app.scheme');",
        '    if (themes.includes(storedTheme)) theme = storedTheme;',
        '    if (schemes.includes(storedScheme)) scheme = storedScheme;',
        '  } catch {}',
        "  document.documentElement.setAttribute('data-theme', theme);",
        "  if (scheme !== null) document.documentElement.setAttribute('data-color-scheme', scheme);",
        '}',
      ].join('\n'),
    );
  });

  it('accepts exactly THEMES, which are the themes the stylesheets define', () => {
    const accepted = acceptedThemes(themeBootScript(KEYS));

    assert.deepEqual(accepted, THEMES.toSorted());
    assert.deepEqual(accepted, styledThemes());
  });
});
