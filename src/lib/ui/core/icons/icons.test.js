import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';

const ICONS = new URL('./', import.meta.url);
const SHAPES = new Set(['circle', 'ellipse', 'g', 'line', 'path', 'polygon', 'polyline', 'rect']);
const ROOT =
  /^<svg\n((?: {2}[a-z][\w:-]*="[^"]*"\n)+)>\n((?: {2}<[a-z]+(?: [a-zA-Z][\w-]*="[^"]*")+ \/>\n)+)<\/svg>\n$/u;
const ATTRIBUTE = /([a-zA-Z][\w:-]*)="([^"]*)"/gu;

/** @returns {readonly string[]} */
function iconFiles() {
  return readdirSync(ICONS)
    .filter((name) => name.endsWith('.svg'))
    .toSorted();
}

/**
 * @param {string} file
 * @returns {string}
 */
function source(file) {
  return readFileSync(new URL(file, ICONS), 'utf8');
}

/**
 * @param {string} text
 * @returns {readonly (readonly [string, string])[]}
 */
function attributes(text) {
  return Array.from(text.matchAll(ATTRIBUTE), (found) => /** @type {const} */ ([
    found[1] ?? '',
    found[2] ?? '',
  ]));
}

/**
 * @param {string} name
 * @returns {readonly (readonly [string, string])[]}
 */
function expectedRoot(name) {
  return [
    ['xmlns', 'http://www.w3.org/2000/svg'],
    ['width', '24'],
    ['height', '24'],
    ['viewBox', '0 0 24 24'],
    ['fill', 'none'],
    ['stroke', 'currentColor'],
    ['stroke-width', '2'],
    ['stroke-linecap', 'round'],
    ['stroke-linejoin', 'round'],
    ['aria-hidden', 'true'],
    ['class', `lucide lucide-${name}`],
  ];
}

describe('the icon set', () => {
  it('holds one kebab-case svg file per icon', () => {
    const files = iconFiles();

    assert.ok(files.length > 0);
    assert.deepEqual(
      files.filter((file) => !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.svg$/u.test(file)),
      [],
    );
  });

  it('writes each icon as one svg root holding self-closed shapes only', () => {
    const malformed = iconFiles().filter((file) => !ROOT.test(source(file)));

    assert.deepEqual(malformed, []);
  });

  it('gives each root the attributes of a Lucide icon, the decorative default and the class of its name', () => {
    for (const file of iconFiles()) {
      const root = ROOT.exec(source(file))?.[1] ?? '';

      assert.deepEqual(
        { file, root: attributes(root) },
        { file, root: expectedRoot(file.slice(0, -'.svg'.length)) },
      );
    }
  });

  it('draws with shape elements only, each with at least one attribute and no stroke width of its own', () => {
    const offenders = iconFiles().flatMap((file) => {
      const shapes = Array.from(source(file).matchAll(/^ {2}<([a-z]+)([^>]*)\/>$/gmu));
      return shapes
        .filter(
          (found) =>
            !SHAPES.has(found[1] ?? '') ||
            attributes(found[2] ?? '').some(([name]) => name === 'stroke-width'),
        )
        .map((found) => `${file}: ${found[0].trim()}`);
    });

    assert.deepEqual(offenders, []);
  });

  it('ships the Lucide license beside the icons', () => {
    const license = readFileSync(new URL('LICENSE.txt', ICONS), 'utf8');

    assert.match(license, /^ISC License/u);
    assert.match(license, /Lucide Icons and Contributors/u);
    assert.match(license, /Feather/u);
  });

  it('holds no index module that could re-export the set', () => {
    assert.deepEqual(
      readdirSync(ICONS).filter((file) => file.startsWith('index.')),
      [],
    );
  });
});
