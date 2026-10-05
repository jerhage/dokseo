import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { filesUnder } from '../library-files.js';

const LIBRARY = new URL('../', import.meta.url);
const TEXT_EXTENSIONS = ['.css', '.js', '.html'];
const LEGACY_PROPERTY = new RegExp('(?<![\\w-])--[cfsr]-[\\w-]+', 'u');

/**
 * @param {readonly string[]} extensions
 * @returns {readonly string[]}
 */
function libraryFiles(extensions) {
  return filesUnder(LIBRARY, extensions);
}

/**
 * @param {string} path
 * @returns {string}
 */
function read(path) {
  return readFileSync(new URL(path, LIBRARY), 'utf8');
}

describe('the styling of the library source', () => {
  it('references no legacy --c-, --f-, --s- or --r- custom property', () => {
    const offenders = libraryFiles(TEXT_EXTENSIONS).flatMap((path) => {
      const found = LEGACY_PROPERTY.exec(read(path));
      return found === null ? [] : [`${path}: ${found[0]}`];
    });

    assert.deepEqual(offenders, []);
  });

  it('writes no eyebrow in the muted colour', () => {
    const offenders = libraryFiles(['.html', '.js'])
      .filter((path) => !path.endsWith('.test.js'))
      .flatMap((path) =>
        Array.from(read(path).matchAll(/["'`]([^"'`]*)["'`]/gu), (found) => found[1] ?? '')
          .filter((classes) => /(?<![\w-])eyebrow(?![\w-])/u.test(classes))
          .filter((classes) => /(?<![\w-])text-muted(?![\w-])/u.test(classes))
          .map((classes) => `${path}: ${classes}`),
      );

    assert.deepEqual(offenders, []);
  });
});
