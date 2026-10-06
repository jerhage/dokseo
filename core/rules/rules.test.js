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
  it('cover the twenty-one components that run a script or a native behaviour', () => {
    assert.deepEqual(ruleFiles(), [
      'accordion-item.json',
      'appearance-choices.json',
      'carousel.json',
      'code-block.json',
      'combobox.json',
      'context-menu.json',
      'dock.json',
      'drawer.json',
      'dropdown.json',
      'dropzone.json',
      'marquee-selection.json',
      'modal.json',
      'popover.json',
      'search-field.json',
      'table-of-contents.json',
      'tabs.json',
      'toast-clearance.json',
      'toast-region.json',
      'toast.json',
      'tooltip.json',
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
          .flatMap((state) => [state.selector, ...Object.values(state.references ?? {})])
          .flatMap(selectorClasses)
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

describe('rulesFileProblems', () => {
  /**
   * @param {Record<string, unknown>} rule
   * @returns {readonly string[]}
   */
  function problemsOf(rule) {
    return rulesFileProblems({
      component: 'marquee-selection',
      behaviour: 'script',
      rules: [
        {
          name: 'draws a box',
          fixture: 'marquee-selection/idle',
          when: [{ event: 'pointerdown' }, { event: 'pointermove', dx: 80, dy: 40 }],
          then: [{ selector: '.marquee-selection-box', present: true }],
          source: 'MarqueeSelection',
          certain: true,
          ...rule,
        },
      ],
    });
  }

  it('accepts a style stated as a measured value with a unit and a tolerance', () => {
    const then = [
      {
        selector: '.marquee-selection-box',
        style: { '--rect-height': { value: 40, unit: 'px', tolerance: 0.5 } },
      },
    ];

    assert.deepEqual(problemsOf({ then }), []);
  });

  it('rejects a measured value without a tolerance, or with a negative one', () => {
    const measured = (/** @type {Record<string, unknown>} */ value) => [
      { selector: '.marquee-selection-box', style: { '--rect-height': value } },
    ];

    assert.deepEqual(problemsOf({ then: measured({ value: 40, unit: 'px' }) }), [
      'rules[0].then[0]: style --rect-height: a measured value has a tolerance of zero or more',
    ]);
    assert.deepEqual(problemsOf({ then: measured({ value: 40, unit: 'px', tolerance: -1 }) }), [
      'rules[0].then[0]: style --rect-height: a measured value has a tolerance of zero or more',
    ]);
  });

  it('rejects a measured value in attributes', () => {
    const then = [
      {
        selector: '.marquee-selection-box',
        attributes: { width: { value: 40, unit: 'px', tolerance: 0.5 } },
      },
    ];

    assert.deepEqual(problemsOf({ then }), [
      'rules[0].then[0]: attributes values must be strings or null',
    ]);
  });

  it('rejects a lift, a move or a cancel that no press comes before', () => {
    const when = [{ event: 'pointerup' }, { event: 'pointerdown' }, { event: 'pointercancel' }];

    assert.deepEqual(problemsOf({ when }), ['rules[0].when[0]: a pointerup follows a press']);
  });

  it('accepts a reference that names the element whose id an attribute holds', () => {
    const then = [
      {
        selector: '.marquee-selection',
        references: { 'aria-activedescendant': '.marquee-selection-box' },
      },
    ];

    assert.deepEqual(problemsOf({ then }), []);
  });

  it('rejects a reference that names no selector', () => {
    const then = [{ selector: '.marquee-selection', references: { 'aria-activedescendant': '' } }];

    assert.deepEqual(problemsOf({ then }), [
      'rules[0].then[0]: references aria-activedescendant must name a selector',
    ]);
  });

  it('accepts a context menu event', () => {
    const when = [{ event: 'contextmenu', target: '.marquee-selection' }];

    assert.deepEqual(problemsOf({ when }), []);
  });

  it('accepts a scroll that names the element it brings to the top', () => {
    const when = [{ event: 'scroll', to: '#fonts' }];

    assert.deepEqual(problemsOf({ when }), []);
  });

  it('rejects a scroll that names no element to bring to the top', () => {
    const when = [{ event: 'scroll', target: 'window' }];

    assert.deepEqual(problemsOf({ when }), [
      'rules[0].when[0]: a scroll names the element it brings to the top',
    ]);
  });

  it('rejects an element to bring to the top on any trigger but a scroll', () => {
    const when = [{ event: 'click', target: '.marquee-selection', to: '#fonts' }];

    assert.deepEqual(problemsOf({ when }), [
      'rules[0].when[0]: only a scroll names an element to bring to the top',
    ]);
  });
});
