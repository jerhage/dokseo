import { PRIMES_BELOW, frameSummary } from '../../../domain/busy-work';
import { PRIMES_WORKER_SOURCE, startForReply } from './demo-workers';
import type { StartDemoWorker } from './demo-workers';

type JankPlace = 'page' | 'worker';

type JankResult = {
  readonly place: JankPlace;
  readonly count: number;
  readonly workMs: number;
  readonly frames: number;
  readonly longestGapMs: number;
};

type FrameClock = {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
};

type JankDeps = {
  readonly clock: FrameClock;
  readonly pause: (ms: number) => Promise<void>;
  readonly countOnPage: (below: number) => number;
  readonly startWorker: StartDemoWorker;
  readonly below?: number;
};

const SWEEP_MS = 1200;

const SETTLE_MS = 400;

function primesReply(data: unknown): { count: number; workMs: number } | null {
  if (typeof data !== 'object' || data === null) return null;
  if (!('count' in data) || !('workMs' in data)) return null;
  if (typeof data.count !== 'number' || typeof data.workMs !== 'number') return null;
  return { count: data.count, workMs: data.workMs };
}

class JankDemo {
  position = $state(0);
  running = $state<JankPlace | null>(null);
  results = $state.raw<readonly JankResult[]>([]);
  failure = $state<string | null>(null);

  #deps: JankDeps;
  #times: number[] = [];
  #handle: number | null = null;

  constructor(deps: JankDeps) {
    this.#deps = deps;
  }

  resultFor(place: JankPlace): JankResult | null {
    return this.results.find((result) => result.place === place) ?? null;
  }

  async run(place: JankPlace): Promise<void> {
    if (this.running !== null) return;
    this.running = place;
    this.failure = null;
    this.#times = [];
    this.#animate();
    try {
      await this.#deps.pause(SETTLE_MS);
      const work = place === 'page' ? this.#onPage() : await this.#inWorker();
      await this.#deps.pause(SETTLE_MS);
      const frames = frameSummary(this.#times);
      this.#record({ place, ...work, ...frames });
    } catch (cause) {
      this.failure = cause instanceof Error ? cause.message : String(cause);
    } finally {
      this.#stop();
      this.running = null;
    }
  }

  dispose(): void {
    this.#stop();
  }

  #onPage(): { count: number; workMs: number } {
    const started = this.#deps.clock.now();
    const count = this.#deps.countOnPage(this.#deps.below ?? PRIMES_BELOW);
    return { count, workMs: this.#deps.clock.now() - started };
  }

  async #inWorker(): Promise<{ count: number; workMs: number }> {
    const { port, reply } = startForReply(this.#deps.startWorker, PRIMES_WORKER_SOURCE);
    try {
      port.post({ below: this.#deps.below ?? PRIMES_BELOW }, []);
      const counted = primesReply(await reply);
      if (counted === null) throw new Error('The worker sent a reply with no count');
      return counted;
    } finally {
      port.stop();
    }
  }

  #record(result: JankResult): void {
    this.results = [...this.results.filter((kept) => kept.place !== result.place), result];
  }

  #animate(): void {
    const step = (time: number): void => {
      this.#times.push(time);
      this.position = (time % SWEEP_MS) / SWEEP_MS;
      this.#handle = this.#deps.clock.request(step);
    };
    this.#handle = this.#deps.clock.request(step);
  }

  #stop(): void {
    if (this.#handle !== null) this.#deps.clock.cancel(this.#handle);
    this.#handle = null;
  }
}

export { JankDemo, SWEEP_MS, primesReply };
export type { FrameClock, JankDeps, JankPlace, JankResult };
