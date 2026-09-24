import { match } from 'ts-pattern';

type Clock = {
  readonly now: () => number;
  readonly schedule: (run: () => void, ms: number) => () => void;
};

type PauseReason = 'hover' | 'focus';

type TimerState =
  | {
      readonly kind: 'running';
      readonly startedAt: number;
      readonly remaining: number;
      readonly cancel: () => void;
    }
  | { readonly kind: 'paused'; readonly remaining: number }
  | { readonly kind: 'expired' }
  | { readonly kind: 'stopped' };

const SYSTEM_CLOCK: Clock = {
  now: () => performance.now(),
  schedule: (run, ms) => {
    const handle = setTimeout(run, ms);
    return () => clearTimeout(handle);
  },
};

class ToastTimer {
  #clock: Clock;
  #onexpire: () => void;
  #holds = new Set<PauseReason>();
  #state: TimerState = { kind: 'stopped' };

  constructor(ms: number, onexpire: () => void, clock: Clock = SYSTEM_CLOCK) {
    this.#clock = clock;
    this.#onexpire = onexpire;
    this.#run(ms);
  }

  get kind(): TimerState['kind'] {
    return this.#state.kind;
  }

  get remaining(): number {
    return match(this.#state)
      .with({ kind: 'running' }, ({ startedAt, remaining }) =>
        Math.max(0, remaining - (this.#clock.now() - startedAt)),
      )
      .with({ kind: 'paused' }, ({ remaining }) => remaining)
      .with({ kind: 'expired' }, { kind: 'stopped' }, () => 0)
      .exhaustive();
  }

  pause(reason: PauseReason): void {
    this.#holds.add(reason);
    if (this.#state.kind !== 'running') return;
    const remaining = this.remaining;
    this.#state.cancel();
    this.#state = { kind: 'paused', remaining };
  }

  resume(reason: PauseReason): void {
    this.#holds.delete(reason);
    if (this.#holds.size > 0 || this.#state.kind !== 'paused') return;
    this.#run(this.#state.remaining);
  }

  stop(): void {
    if (this.#state.kind === 'running') this.#state.cancel();
    if (this.#state.kind !== 'expired') this.#state = { kind: 'stopped' };
  }

  #run(remaining: number): void {
    const cancel = this.#clock.schedule(() => this.#expire(), remaining);
    this.#state = { kind: 'running', startedAt: this.#clock.now(), remaining, cancel };
  }

  #expire(): void {
    if (this.#state.kind !== 'running') return;
    this.#state = { kind: 'expired' };
    this.#onexpire();
  }
}

export { SYSTEM_CLOCK, ToastTimer };
export type { Clock, PauseReason, TimerState };
