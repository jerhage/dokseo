import { describe, expect, it } from 'vitest';
import { BUG_PRESETS } from '../../../domain/test-kinds';
import {
  DoublesBench,
  MutationBench,
  RevertBench,
  TestKindChooser,
  adviceCard,
} from './testing-demos.svelte';
import { TurnRunner } from './turn-runner.svelte';

describe('TurnRunner', () => {
  it('starts with every recorded case passing', () => {
    const runner = new TurnRunner();

    expect(runner.verdict).toBe('passed');
    expect(runner.failures).toBe(0);
  });

  it('fails the edited case when its inputs or its expectation change, and resets', () => {
    const runner = new TurnRunner();
    runner.edit(3);
    runner.toggleQuery('(any-pointer: coarse)');

    expect(runner.verdict).toBe('failed');
    expect(runner.outcomes[3]?.kind).toBe('failed');

    runner.toggleExpected('touchTurns');
    expect(runner.verdict).toBe('passed');

    runner.toggleExpected('edgeClicks');
    expect(runner.failures).toBe(1);

    runner.reset();
    expect(runner.failures).toBe(0);
  });

  it('ignores an index outside the cases', () => {
    const runner = new TurnRunner();
    runner.edit(99);

    expect(runner.editing).toBe(0);
  });
});

describe('MutationBench', () => {
  it('fails no test until a mutant that changes behaviour is chosen', () => {
    const bench = new MutationBench();

    expect(bench.failed).toBe(0);
    bench.choose('left-or-equal');
    expect(bench.failed).toBe(0);
    expect(bench.source).toContain('x <= side');
    bench.choose('variant-flipped');
    expect(bench.failed).toBe(2);
    bench.choose('no-such-mutant');
    expect(bench.chosen).toBe('variant-flipped');
  });
});

describe('RevertBench', () => {
  it('counts the failing cases of the chosen rule', () => {
    const bench = new RevertBench();

    expect(bench.summary.failing).toBe(0);
    bench.choose('language-only');
    expect(bench.summary.failing).toBe(5);
    bench.choose('larger-only');
    expect(bench.summary.failing).toBe(2);
    bench.choose('nonsense');
    expect(bench.rule).toBe('larger-only');
  });
});

describe('DoublesBench', () => {
  it('runs the four tests against the chosen version', async () => {
    const bench = new DoublesBench();
    await bench.run();

    expect(bench.tests.map((test) => test.outcome.kind)).toEqual([
      'passed',
      'passed',
      'passed',
      'passed',
    ]);

    await bench.choose('lists-twice');
    expect(bench.version).toBe('lists-twice');
    expect(bench.tests[2]?.outcome.kind).toBe('failed');
  });
});

describe('TestKindChooser', () => {
  it('advises from the place and the sighting, and a preset sets both', () => {
    const chooser = new TestKindChooser();

    expect(chooser.advice.kind).toBe('unit');
    chooser.choosePlace('layout');
    chooser.chooseSighting('suspected');
    expect(chooser.advice.kind).toBe('none');

    const sheet = BUG_PRESETS.find((preset) => preset.key === 'sheet');
    if (sheet === undefined) throw new Error('No sheet preset');
    chooser.usePreset(sheet);
    expect(chooser.advice.kind).toBe('probe');
    expect(chooser.preset).toBe('sheet');

    chooser.chooseSighting('seen');
    expect(chooser.preset).toBeNull();

    chooser.usePresetKey('style-block');
    expect([chooser.place, chooser.sighting, chooser.preset]).toEqual([
      'source-rule',
      'suspected',
      'style-block',
    ]);
    chooser.usePresetKey('');
    expect(chooser.preset).toBeNull();
  });
});

describe('adviceCard', () => {
  it('titles each kind of advice and drops the place for no test', () => {
    expect(adviceCard({ kind: 'none', reason: 'r' })).toEqual({
      variant: 'danger',
      title: 'No browser test',
      where: null,
      reason: 'r',
    });
    expect(adviceCard({ kind: 'browser', where: 'w', reason: 'r' }).title).toBe('A browser test');
  });
});
