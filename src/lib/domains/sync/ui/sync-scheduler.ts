import type { SyncNowResult } from '../use-cases/sync-now';
import {
  CHANGE_DEBOUNCE_MS,
  IDLE,
  finishRun,
  mayRunNow,
  requestRun,
  runOutcome,
  runsOnVisibility,
} from './sync-schedule';
import type { RunGate } from './sync-schedule';

type SchedulerEnv = {
  readonly isConnected: () => Promise<boolean>;
  readonly isOnline: () => boolean;
  readonly exclusively: (work: () => Promise<void>) => Promise<void>;
  readonly sync: () => Promise<SyncNowResult>;
  readonly synced: () => void;
  readonly signedOut: () => void;
  readonly failed: (cause: unknown) => void;
  readonly watchChanges: (onChange: () => void) => () => void;
  readonly startTimer: (callback: () => void, delayMs: number) => () => void;
};

class SyncScheduler {
  readonly #env: SchedulerEnv;
  #gate: RunGate = IDLE;
  #stopped = true;
  #stopWatching: (() => void) | null = null;
  #cancelDebounce: (() => void) | null = null;
  #toldSignedOut = false;

  constructor(env: SchedulerEnv) {
    this.#env = env;
  }

  start(): void {
    if (!this.#stopped) return;
    this.#stopped = false;
    this.#stopWatching = this.#env.watchChanges(() => this.changed());
    this.request();
  }

  stop(): void {
    this.#stopped = true;
    this.#stopWatching?.();
    this.#stopWatching = null;
    this.#cancelDebounce?.();
    this.#cancelDebounce = null;
  }

  changed(): void {
    if (this.#stopped) return;
    this.#cancelDebounce?.();
    this.#cancelDebounce = this.#env.startTimer(() => {
      this.#cancelDebounce = null;
      this.request();
    }, CHANGE_DEBOUNCE_MS);
  }

  visibilityChanged(state: DocumentVisibilityState): void {
    if (runsOnVisibility(state)) this.request();
  }

  request(): void {
    if (this.#stopped) return;
    const step = requestRun(this.#gate);
    this.#gate = step.gate;
    if (step.start) void this.#drain();
  }

  async #drain(): Promise<void> {
    let again = true;
    while (again) {
      await this.#once();
      const step = finishRun(this.#gate);
      this.#gate = step.gate;
      again = step.start;
    }
  }

  async #once(): Promise<void> {
    try {
      if (!this.#env.isOnline()) return;
      const connected = await this.#env.isConnected();
      if (!mayRunNow({ connected, online: this.#env.isOnline() })) return;
      await this.#env.exclusively(async () => {
        const result = await this.#env.sync();
        this.#settled(result);
      });
    } catch (cause) {
      this.#env.failed(cause);
    }
  }

  #settled(result: SyncNowResult): void {
    const outcome = runOutcome(result);
    if (outcome.kind === 'synced') this.#env.synced();
    if (outcome.kind === 'signed-out' && !this.#toldSignedOut) {
      this.#toldSignedOut = true;
      this.#env.signedOut();
    }
  }
}

export { SyncScheduler };
export type { SchedulerEnv };
