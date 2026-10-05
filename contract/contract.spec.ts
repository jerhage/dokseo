import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { compareMarkup } from '../core/contract/compare.js';
import { filesUnder } from '../library-files';
import CaseHost from './CaseHost.svelte';
import { CASES } from './cases';

const FIXTURES = new URL('../core/fixtures/', import.meta.url);

function fixture(path: string): string {
  return readFileSync(new URL(`${path}.html`, FIXTURES), 'utf8');
}

function fixturePaths(): readonly string[] {
  return filesUnder(FIXTURES, ['.html'])
    .map((file) => file.slice(0, -'.html'.length))
    .toSorted();
}

describe('the markup contract', () => {
  it.each(CASES.map((shown) => [shown.path, shown] as const))(
    'renders %s as its core fixture describes',
    (path, shown) => {
      const result = compareMarkup(render(CaseHost, { props: { shown } }).body, fixture(path));

      expect(result.rendered).toBe(result.fixture);
    },
  );

  it('holds exactly one case for each fixture in the core', () => {
    const paths = CASES.map((shown) => shown.path);

    expect(paths.filter((path, index) => paths.indexOf(path) !== index)).toEqual([]);
    expect(paths.toSorted()).toEqual(fixturePaths());
  });
});
