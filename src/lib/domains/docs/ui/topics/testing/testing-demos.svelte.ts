import { match } from 'ts-pattern';
import { MUTANTS, mutantSource, runZoneTests } from '../../../domain/tap-zone-mutants';
import type { Mutant, MutantKey } from '../../../domain/tap-zone-mutants';
import { BUG_PRESETS, adviseTestKind, isBugPlace, isSighting } from '../../../domain/test-kinds';
import type { BugPlace, BugPreset, Sighting, TestAdvice } from '../../../domain/test-kinds';
import { isConsentRule, runConsentCases } from './consent-rules';
import type { ConsentRule } from './consent-rules';
import { isCreateVersion, runDoubleTests } from './tag-doubles';
import type { CreateVersion, DoubleTest } from './tag-doubles';

type AdviceCard = {
  readonly variant: 'success' | 'info' | 'warning' | 'danger';
  readonly title: string;
  readonly where: string | null;
  readonly reason: string;
};

function adviceCard(advice: TestAdvice): AdviceCard {
  return match(advice)
    .with({ kind: 'unit' }, ({ where, reason }): AdviceCard => ({
      variant: 'success',
      title: 'A unit test',
      where,
      reason,
    }))
    .with({ kind: 'static' }, ({ where, reason }): AdviceCard => ({
      variant: 'info',
      title: 'A static rule, not a test',
      where,
      reason,
    }))
    .with({ kind: 'browser' }, ({ where, reason }): AdviceCard => ({
      variant: 'warning',
      title: 'A browser test',
      where,
      reason,
    }))
    .with({ kind: 'probe' }, ({ where, reason }): AdviceCard => ({
      variant: 'info',
      title: 'A probe, then the device',
      where,
      reason,
    }))
    .with({ kind: 'none' }, ({ reason }): AdviceCard => ({
      variant: 'danger',
      title: 'No browser test',
      where: null,
      reason,
    }))
    .exhaustive();
}

function mutantOf(key: string): Mutant | undefined {
  return MUTANTS.find((mutant) => mutant.key === key);
}

class MutationBench {
  chosen = $state<MutantKey>('original');

  readonly mutant = $derived(mutantOf(this.chosen));
  readonly source = $derived(this.mutant === undefined ? '' : mutantSource(this.mutant));
  readonly runs = $derived(runZoneTests(this.chosen));
  readonly failed = $derived(this.runs.filter((run) => run.verdict === 'failed').length);

  choose(key: string): void {
    const mutant = mutantOf(key);
    if (mutant !== undefined) this.chosen = mutant.key;
  }
}

class RevertBench {
  rule = $state<ConsentRule>('fixed');

  readonly summary = $derived(runConsentCases(this.rule));

  choose(value: string): void {
    if (isConsentRule(value)) this.rule = value;
  }
}

class DoublesBench {
  version = $state<CreateVersion>('real');
  tests = $state.raw<readonly DoubleTest[]>([]);

  #generation = 0;

  async choose(value: string): Promise<void> {
    if (!isCreateVersion(value)) return;
    this.version = value;
    await this.run();
  }

  async run(): Promise<void> {
    const generation = ++this.#generation;
    const tests = await runDoubleTests(this.version);
    if (generation !== this.#generation) return;
    this.tests = tests;
  }
}

class TestKindChooser {
  place = $state<BugPlace>('pure-logic');
  sighting = $state<Sighting>('seen');
  preset = $state<string | null>(null);

  readonly advice = $derived(adviseTestKind(this.place, this.sighting));

  choosePlace(value: string): void {
    if (!isBugPlace(value)) return;
    this.place = value;
    this.preset = null;
  }

  chooseSighting(value: string): void {
    if (!isSighting(value)) return;
    this.sighting = value;
    this.preset = null;
  }

  usePresetKey(key: string): void {
    const preset = BUG_PRESETS.find((candidate) => candidate.key === key);
    if (preset === undefined) this.preset = null;
    else this.usePreset(preset);
  }

  usePreset(preset: BugPreset): void {
    this.place = preset.place;
    this.sighting = preset.sighting;
    this.preset = preset.key;
  }
}

export { DoublesBench, MutationBench, RevertBench, TestKindChooser, adviceCard };
export type { AdviceCard };
