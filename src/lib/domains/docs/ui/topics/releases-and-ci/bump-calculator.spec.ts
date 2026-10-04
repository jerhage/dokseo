import { describe, expect, it } from 'vitest';
import { formatVersion } from '../../../domain/release-bump';
import { BumpCalculator, COMMIT_PRESETS } from './bump-calculator.svelte';
import type { CalculatorResult } from './bump-calculator.svelte';

function shown(result: CalculatorResult): string {
  if (result.kind === 'bad-version') return 'bad-version';
  const { release } = result;
  return release.kind === 'release' || release.kind === 'nothing-to-release'
    ? `${release.kind} ${formatVersion(release.version)}`
    : release.kind;
}

describe('BumpCalculator', () => {
  it.each([
    ['release-0-9-3', 'release 0.9.3', 'release 1.2.1'],
    ['release-0-9-4', 'release 0.9.4', 'release 1.3.0'],
    ['hidden-only', 'nothing-to-release 0.9.5', 'nothing-to-release 1.2.1'],
    ['breaking', 'release 0.10.0', 'release 2.0.0'],
    ['release-as', 'release 1.0.0', 'release 1.0.0'],
  ])('computes the %s preset before and after 1.0', (key, before, after) => {
    const calculator = new BumpCalculator(key);

    expect(shown(calculator.before)).toBe(before);
    expect(shown(calculator.after)).toBe(after);
  });

  it('starts each preset from the version before it and keeps a typed version until the next preset', () => {
    const calculator = new BumpCalculator('release-0-9-4');
    calculator.beforeOne = '0.9.9';

    expect(shown(calculator.before)).toBe('release 0.9.10');
    calculator.load('release-0-9-3');
    expect(calculator.beforeOne).toBe('0.9.2');
  });

  it('switches to the release-please defaults', () => {
    const calculator = new BumpCalculator('release-0-9-4');
    calculator.settings = 'defaults';

    expect(shown(calculator.before)).toBe('release 0.10.0');
  });

  it('adds a typed commit as the newest and clears the draft', () => {
    const calculator = new BumpCalculator('hidden-only');
    calculator.draft = '  perf: decode each page once ';
    calculator.add();

    expect(calculator.messages[0]).toBe('perf: decode each page once');
    expect(calculator.draft).toBe('');
    expect(shown(calculator.before)).toBe('release 0.9.5');
  });

  it('ignores an empty draft and removes a commit by id', () => {
    const calculator = new BumpCalculator('breaking');
    calculator.add();
    const [first] = calculator.commits;
    if (first === undefined) throw new Error('no commit');
    calculator.remove(first.id);

    expect(calculator.commits).toHaveLength(1);
    expect(shown(calculator.before)).toBe('release 0.10.0');
  });

  it('reports no commits after clear and a bad version for text with no version', () => {
    const calculator = new BumpCalculator();
    calculator.clear();
    calculator.afterOne = 'one';

    expect(shown(calculator.before)).toBe('no-commits');
    expect(shown(calculator.after)).toBe('bad-version');
  });

  it('gives every preset a distinct key', () => {
    expect(new Set(COMMIT_PRESETS.map((preset) => preset.key)).size).toBe(COMMIT_PRESETS.length);
  });
});
