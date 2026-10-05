import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { filesUnder } from '../library-files.js';
import { rulesFileProblems } from './schema.js';

const RULES = new URL('./', import.meta.url);
const FIXTURES = new URL('../fixtures/', import.meta.url);
const STYLES = new URL('../styles/', import.meta.url);
const CLASS_IN_SELECTOR = /\.([a-zA-Z][\w-]*)/gu;

/** @typedef {import('./schema.js').RulesFile} RulesFile */
/** @typedef {import('./schema.js').ElementState} ElementState */

/** @returns {readonly string[]} */
function ruleFiles() {
  return readdirSync(RULES)
    .filter((name) => name.endsWith('.json'))
    .toSorted();
}

/**
 * @param {string} name
 * @returns {unknown}
 */
function parsed(name) {
  return JSON.parse(readFileSync(new URL(name, RULES), 'utf8'));
}

/**
 * @param {string} name
 * @returns {RulesFile}
 */
function rulesFile(name) {
  const file = parsed(name);
  const problems = rulesFileProblems(file);
  if (problems.length > 0) throw new Error(`${name}: ${problems.join('; ')}`);
  return /** @type {RulesFile} */ (file);
}

/**
 * @param {string} fixture
 * @returns {URL}
 */
function fixtureUrl(fixture) {
  return new URL(`${fixture}.html`, FIXTURES);
}

/**
 * @param {string} markup
 * @returns {ReadonlySet<string>}
 */
function writtenClasses(markup) {
  return new Set(
    Array.from(markup.matchAll(/\sclass="([^"]*)"/gu), (found) => found[1] ?? '').flatMap((names) =>
      names.split(' '),
    ),
  );
}

/** @returns {string} */
function stylesheets() {
  return filesUnder(STYLES, ['.css'])
    .map((path) => readFileSync(new URL(path, STYLES), 'utf8'))
    .join('\n');
}

/**
 * @param {string} selector
 * @returns {readonly string[]}
 */
function selectorClasses(selector) {
  return Array.from(selector.matchAll(CLASS_IN_SELECTOR), (found) => found[1] ?? '');
}

describe('the behaviour rules', () => {
  it('cover the fifteen components that run a script or a native behaviour', () => {
    assert.deepEqual(ruleFiles(), [
      'accordion-item.json',
      'carousel.json',
      'code-block.json',
      'dock.json',
      'dropdown.json',
      'dropzone.json',
      'marquee-selection.json',
      'modal.json',
      'popover.json',
      'search-field.json',
      'tabs.json',
      'toast-clearance.json',
      'toast-region.json',
      'toast.json',
      'window-dropzone.json',
    ]);
  });

  it('are each a well-formed rules file named after its component', () => {
    const problems = ruleFiles().flatMap((name) => {
      const file = parsed(name);
      const found = rulesFileProblems(file).map((problem) => `${name}: ${problem}`);
      const component =
        typeof file === 'object' && file !== null && 'component' in file
          ? file.component
          : undefined;
      return component === name.slice(0, -'.json'.length)
        ? found
        : [...found, `${name}: names ${String(component)}`];
    });

    assert.deepEqual(problems, []);
  });

  it('name a fixture that exists in every rule', () => {
    const missing = ruleFiles().flatMap((name) =>
      rulesFile(name)
        .rules.filter((rule) => !existsSync(fixtureUrl(rule.fixture)))
        .map((rule) => `${name}: ${rule.fixture}`),
    );

    assert.deepEqual(missing, []);
  });

  it('start from elements the fixture holds, and end on elements the fixture or the stylesheets know', () => {
    const styled = stylesheets();
    const problems = ruleFiles().flatMap((name) =>
      rulesFile(name).rules.flatMap((rule) => {
        const held = writtenClasses(readFileSync(fixtureUrl(rule.fixture), 'utf8'));
        const starting = [
          ...(rule.given ?? []),
          ...rule.when.flatMap((trigger) =>
            trigger.target === undefined ? [] : [{ selector: trigger.target }],
          ),
        ];
        const unheld = starting
          .flatMap((state) => selectorClasses(state.selector))
          .filter((found) => !held.has(found));
        const unknown = (rule.then ?? [])
          .flatMap((state) => selectorClasses(state.selector))
          .filter((found) => !held.has(found) && !styled.includes(`.${found}`));
        return [...unheld, ...unknown].map((found) => `${name}: "${rule.name}" names .${found}`);
      }),
    );

    assert.deepEqual(problems, []);
  });

  it('say why in a note wherever a rule is marked uncertain', () => {
    const silent = ruleFiles().flatMap((name) =>
      rulesFile(name)
        .rules.filter((rule) => !rule.certain && (rule.note ?? '') === '')
        .map((rule) => `${name}: ${rule.name}`),
    );

    assert.deepEqual(silent, []);
  });
});
