import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fixtureText } from '../contract/format.js';
import { isVoidElement } from '../contract/normalize.js';
import { filesUnder } from '../library-files.js';

const FIXTURES = new URL('./', import.meta.url);
const STYLES = new URL('../styles/', import.meta.url);
const LIBRARY_FOLDERS = ['components/', 'utilities/', 'overrides/'];
const FIXTURE_PATH = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.html$/u;
const ICON_NAME = /^lucide-[a-z0-9-]+$/u;
const UNSTYLED_HOOKS = new Set(['dock-rail']);
const TAG = /<\/?([a-zA-Z][\w-]*)[^>]*>/gu;

/** @returns {readonly string[]} */
function fixturePaths() {
  return filesUnder(FIXTURES, ['.html']);
}

/**
 * @param {string} path
 * @returns {string}
 */
function fixture(path) {
  return readFileSync(new URL(path, FIXTURES), 'utf8');
}

/**
 * @param {string} markup
 * @returns {readonly string[]}
 */
function balanceProblems(markup) {
  /** @type {string[]} */
  const open = [];
  /** @type {string[]} */
  const problems = [];
  for (const found of markup.matchAll(TAG)) {
    const name = found[1] ?? '';
    const closing = found[0].startsWith('</');
    if (closing && isVoidElement(name)) problems.push(`a void element is closed: ${found[0]}`);
    else if (closing && open.at(-1) === name) open.pop();
    else if (closing) problems.push(`${found[0]} closes ${open.at(-1) ?? 'nothing'}`);
    else if (!isVoidElement(name)) open.push(name);
  }
  return [...problems, ...open.map((name) => `<${name}> is never closed`)];
}

/**
 * @param {string} css
 * @returns {ReadonlySet<string>}
 */
function classesIn(css) {
  const plain = css.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
  return new Set(Array.from(plain.matchAll(/\.([a-z][\w-]*)/gu), (found) => found[1] ?? ''));
}

/**
 * @param {URL} root
 * @returns {string}
 */
function stylesheetsUnder(root) {
  return filesUnder(root, ['.css'])
    .map((path) => readFileSync(new URL(path, root), 'utf8'))
    .join('\n');
}

/**
 * @param {string} markup
 * @returns {readonly string[]}
 */
function writtenClasses(markup) {
  return Array.from(markup.matchAll(/\sclass="([^"]*)"/gu), (found) => found[1] ?? '').flatMap(
    (names) => names.split(' ').filter((name) => name !== ''),
  );
}

/**
 * @param {string} name
 * @returns {string}
 */
function family(name) {
  return name.split('-')[0] ?? '';
}

describe('the fixtures', () => {
  it('sit one per variant at fixtures/<component>/<variant>.html, in kebab case', () => {
    const paths = fixturePaths();

    assert.ok(paths.length > 0);
    assert.deepEqual(
      paths.filter((path) => !FIXTURE_PATH.test(path)),
      [],
    );
  });

  it('are each already normalized and formatted, so a fixture reads exactly as the tooling writes it', () => {
    const drifted = fixturePaths().filter((path) => fixtureText(fixture(path)) !== fixture(path));

    assert.deepEqual(drifted, []);
  });

  it('parse as balanced markup: every element is closed in order and no void element is', () => {
    const problems = fixturePaths().flatMap((path) =>
      balanceProblems(fixture(path)).map((problem) => `${path}: ${problem}`),
    );

    assert.deepEqual(problems, []);
  });

  it('write ids only as placeholders numbered from id-1', () => {
    const offenders = fixturePaths().flatMap((path) =>
      Array.from(fixture(path).matchAll(/\s(?:id|for)="([^"]*)"/gu), (found) => found[1] ?? '')
        .filter((id) => !/^id-[1-9]\d*$/u.test(id))
        .map((id) => `${path}: ${id}`),
    );

    assert.deepEqual(offenders, []);
  });

  it('find every class of a design system family in some stylesheet', () => {
    const defined = classesIn(stylesheetsUnder(STYLES));
    const families = new Set(
      Array.from(
        classesIn(
          LIBRARY_FOLDERS.map((folder) => stylesheetsUnder(new URL(folder, STYLES))).join('\n'),
        ),
        family,
      ),
    );
    const missing = fixturePaths().flatMap((path) =>
      writtenClasses(fixture(path))
        .filter((name) => families.has(family(name)) && !defined.has(name))
        .filter((name) => !ICON_NAME.test(name) && !UNSTYLED_HOOKS.has(name))
        .map((name) => `${path}: ${name}`),
    );

    assert.deepEqual([...new Set(missing)], []);
  });
});
