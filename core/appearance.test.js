import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { THEMES, applyAppearance, readAppearance } from './appearance.js';

const THEME_SHEETS = new URL('./styles/base/themes/', import.meta.url);

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

class FakeRoot {
  /** @type {Map<string, string>} */
  attributes = new Map();

  /** @param {Readonly<Record<string, string>>} [initial] */
  constructor(initial = {}) {
    for (const [name, value] of Object.entries(initial)) this.attributes.set(name, value);
  }

  /**
   * @param {string} name
   * @returns {string | null}
   */
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  /** @param {string} name */
  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

describe('applyAppearance', () => {
  it('writes the chosen theme to data-theme', () => {
    const root = new FakeRoot({ 'data-theme': 'base' });

    applyAppearance(root, { theme: 'ember', colorScheme: 'automatic' });

    assert.equal(root.attributes.get('data-theme'), 'ember');
  });

  it('pins a light or a dark scheme on data-color-scheme', () => {
    const light = new FakeRoot();
    const dark = new FakeRoot();

    applyAppearance(light, { theme: 'base', colorScheme: 'light' });
    applyAppearance(dark, { theme: 'base', colorScheme: 'dark' });

    assert.deepEqual(
      [light.attributes.get('data-color-scheme'), dark.attributes.get('data-color-scheme')],
      ['light', 'dark'],
    );
  });

  it('removes a pinned scheme for automatic and writes no value in its place', () => {
    const root = new FakeRoot({ 'data-theme': 'base', 'data-color-scheme': 'dark' });

    applyAppearance(root, { theme: 'base', colorScheme: 'automatic' });

    assert.equal(root.attributes.has('data-color-scheme'), false);
    assert.deepEqual([...root.attributes.keys()], ['data-theme']);
  });
});

describe('readAppearance', () => {
  for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
    it(`reads the theme and the pinned ${colorScheme} scheme the root carries`, () => {
      const root = new FakeRoot({ 'data-theme': 'ember', 'data-color-scheme': colorScheme });

      assert.deepEqual(readAppearance(root), { theme: 'ember', colorScheme });
    });
  }

  for (const [name, attributes] of /** @type {const} */ ([
    ['no scheme pinned', { 'data-theme': 'base' }],
    ['values it does not know', { 'data-theme': 'neon', 'data-color-scheme': 'auto' }],
  ])) {
    it(`falls back to base and automatic for ${name}`, () => {
      assert.deepEqual(readAppearance(new FakeRoot(attributes)), {
        theme: 'base',
        colorScheme: 'automatic',
      });
    });
  }
});

describe('THEMES', () => {
  it('lists exactly the themes the stylesheet defines, each once', () => {
    assert.deepEqual(THEMES.toSorted(), [
      'base',
      'crayon',
      'ember',
      'forge',
      'mono',
      'moss',
      'petal',
      'yorha',
    ]);
    assert.deepEqual(THEMES.toSorted(), styledThemes());
  });
});
