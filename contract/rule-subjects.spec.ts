import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { compareMarkup } from '../core/contract/compare.js';
import { rulesFileProblems } from '../core/rules/schema.js';
import type { RulesFile } from '../core/rules/schema.js';
import { filesUnder } from '../library-files';
import { RuleControls } from './rule-controls.svelte';
import { RULE_SUBJECTS } from './rule-subjects';
import RuleHost from './RuleHost.svelte';

const CORE = new URL('../core/', import.meta.url);
const RULES = new URL('rules/', CORE);

function isRulesFile(value: unknown): value is RulesFile {
  return rulesFileProblems(value).length === 0;
}

function rulesFiles(): readonly RulesFile[] {
  return filesUnder(RULES, ['.json']).map((path) => {
    const file: unknown = JSON.parse(readFileSync(new URL(path, RULES), 'utf8'));
    if (!isRulesFile(file)) throw new Error(`${path}: ${rulesFileProblems(file).join('; ')}`);
    return file;
  });
}

function ruleFixtures(): readonly string[] {
  return [...new Set(rulesFiles().flatMap((file) => file.rules.map((rule) => rule.fixture)))];
}

function fixture(path: string): string {
  return readFileSync(new URL(`fixtures/${path}.html`, CORE), 'utf8');
}

describe('the subjects the behaviour rules run against', () => {
  it('holds exactly one subject for each fixture a core rule starts from', () => {
    expect(Object.keys(RULE_SUBJECTS).toSorted()).toEqual(ruleFixtures().toSorted());
  });

  it.each(Object.entries(RULE_SUBJECTS))(
    'renders %s as its core fixture describes before any rule acts',
    (path, subject) => {
      const controls = new RuleControls();
      subject.prepare?.(controls);
      const markup = render(RuleHost, { props: { subject, controls } }).body;
      const result = compareMarkup(markup, fixture(path));

      expect(result.rendered).toBe(result.fixture);
    },
  );
});
