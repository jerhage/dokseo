import type { ShownTurnSettings } from '$lib/shared/turn-settings';
import { testVerdict } from '../../../domain/spec-runner';
import { TURN_CASES, checkTurnCase } from '../../../domain/turn-cases';
import type { TurnCase, TurnQuery } from '../../../domain/turn-cases';

type ExpectedSetting = keyof ShownTurnSettings;

class TurnRunner {
  cases = $state.raw<readonly TurnCase[]>(TURN_CASES);
  editing = $state(0);

  readonly outcomes = $derived(this.cases.map(checkTurnCase));
  readonly verdict = $derived(testVerdict(this.outcomes));
  readonly failures = $derived(this.outcomes.filter((outcome) => outcome.kind !== 'passed').length);

  get edited(): TurnCase | undefined {
    return this.cases[this.editing];
  }

  edit(index: number): void {
    if (index >= 0 && index < this.cases.length) this.editing = index;
  }

  toggleQuery(query: TurnQuery): void {
    this.#replace((turnCase) => ({
      ...turnCase,
      matching: turnCase.matching.includes(query)
        ? turnCase.matching.filter((matched) => matched !== query)
        : [...turnCase.matching, query],
    }));
  }

  toggleExpected(setting: ExpectedSetting): void {
    this.#replace((turnCase) => ({
      ...turnCase,
      expected: { ...turnCase.expected, [setting]: !turnCase.expected[setting] },
    }));
  }

  reset(): void {
    this.cases = TURN_CASES;
  }

  #replace(change: (turnCase: TurnCase) => TurnCase): void {
    this.cases = this.cases.map((turnCase, index) =>
      index === this.editing ? change(turnCase) : turnCase,
    );
  }
}

export { TurnRunner };
export type { ExpectedSetting };
