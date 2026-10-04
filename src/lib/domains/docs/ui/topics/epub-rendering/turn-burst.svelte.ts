import { match } from 'ts-pattern';
import { readCfi, spinePosition } from '../../../domain/cfi-reading';
import type { DemoRelocation } from './flow-kit';

type BurstState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running'; readonly pressed: number }
  | {
      readonly kind: 'done';
      readonly pressed: number;
      readonly landed: readonly (number | null)[];
    };

type Wait = (milliseconds: number) => Promise<void>;

type BurstPlan = {
  readonly presses: number;
  readonly gap: number;
  readonly settle: number;
};

const IDLE: BurstState = { kind: 'idle' };

const TEN_PRESSES: BurstPlan = { presses: 10, gap: 40, settle: 800 };

function realWait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function chapterList(landed: readonly (number | null)[]): string {
  return landed.map((chapter) => (chapter === null ? '?' : String(chapter))).join(', ');
}

function burstSummary(state: BurstState): string {
  return match(state)
    .with({ kind: 'idle' }, () => 'No presses yet.')
    .with({ kind: 'running' }, (running) => `Pressing: ${running.pressed}…`)
    .with({ kind: 'done' }, (done) => {
      const turns = `${done.pressed} presses, ${done.landed.length} page turns.`;
      return done.landed.length === 0
        ? turns
        : `${turns} Spine positions after each turn: ${chapterList(done.landed)}.`;
    })
    .exhaustive();
}

class TurnBurst {
  state = $state.raw<BurstState>(IDLE);

  #wait: Wait;
  #landed: (number | null)[] = [];
  #counting = false;

  constructor(wait: Wait = realWait) {
    this.#wait = wait;
  }

  get running(): boolean {
    return this.state.kind === 'running';
  }

  async run(press: () => unknown, plan: BurstPlan = TEN_PRESSES): Promise<void> {
    if (this.running) return;

    this.#landed = [];
    this.#counting = true;
    for (let pressed = 1; pressed <= plan.presses; pressed += 1) {
      press();
      this.state = { kind: 'running', pressed };
      await this.#wait(plan.gap);
    }
    await this.#wait(plan.settle);
    this.#counting = false;
    this.state = { kind: 'done', pressed: plan.presses, landed: [...this.#landed] };
  }

  moved(at: DemoRelocation): void {
    if (!this.#counting || at.cause.kind !== 'travel') return;

    this.#landed.push(spinePosition(readCfi(at.cfi) ?? []));
  }
}

export { burstSummary, TEN_PRESSES, TurnBurst };
export type { BurstPlan, BurstState, Wait };
