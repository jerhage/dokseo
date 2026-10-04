import { COUNTER_WORKER_SOURCE, errorParts, startForReply } from './demo-workers';
import type { DemoPort, StartDemoWorker } from './demo-workers';

type CountMode = 'plain' | 'atomic';

type CountRun = {
  readonly mode: CountMode;
  readonly expected: number;
  readonly total: number;
  readonly ms: number;
};

type WaiterState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'woke'; readonly result: string };

type CounterDeps = {
  readonly startWorker: StartDemoWorker;
  readonly now: () => number;
  readonly workers?: number;
  readonly times?: number;
};

const COUNTING_WORKERS = 2;

const ADDS_PER_WORKER = 2_000_000;

const COUNT_CELL = 0;

const SIGNAL_CELL = 1;

function counterKind(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('kind' in data)) return null;
  return typeof data.kind === 'string' ? data.kind : null;
}

function wakeResult(data: unknown): string {
  if (typeof data !== 'object' || data === null || !('result' in data)) return 'no result';
  return String(data.result);
}

class SharedCounter {
  running = $state<CountMode | null>(null);
  runs = $state.raw<readonly CountRun[]>([]);
  waiter = $state.raw<WaiterState>({ kind: 'idle' });
  pageWait = $state<string | null>(null);
  failure = $state<string | null>(null);

  #deps: CounterDeps;
  #waiterPort: DemoPort | null = null;
  #signal: Int32Array | null = null;

  constructor(deps: CounterDeps) {
    this.#deps = deps;
  }

  get expected(): number {
    return (this.#deps.workers ?? COUNTING_WORKERS) * (this.#deps.times ?? ADDS_PER_WORKER);
  }

  async count(mode: CountMode): Promise<void> {
    if (this.running !== null) return;
    this.running = mode;
    this.failure = null;
    const cells = new Int32Array(new SharedArrayBuffer(2 * Int32Array.BYTES_PER_ELEMENT));
    const times = this.#deps.times ?? ADDS_PER_WORKER;
    const started = Array.from({ length: this.#deps.workers ?? COUNTING_WORKERS }, () =>
      startForReply(this.#deps.startWorker, COUNTER_WORKER_SOURCE),
    );
    try {
      const began = this.#deps.now();
      for (const { port } of started) port.post({ cells, mode, times }, []);
      await Promise.all(started.map(({ reply }) => reply));
      const ms = this.#deps.now() - began;
      const run: CountRun = {
        mode,
        expected: this.expected,
        total: Atomics.load(cells, COUNT_CELL),
        ms,
      };
      this.runs = [run, ...this.runs];
    } catch (cause) {
      const parts = errorParts(cause);
      this.failure = `${parts.name}: ${parts.message}`;
    } finally {
      for (const { port } of started) port.stop();
      this.running = null;
    }
  }

  waitOnPage(): void {
    const cells = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2));
    try {
      const result = Atomics.wait(cells, SIGNAL_CELL, 0, 0);
      this.pageWait = `Returned "${result}"`;
    } catch (cause) {
      const parts = errorParts(cause);
      this.pageWait = `${parts.name}: ${parts.message}`;
    }
  }

  startWaiter(): void {
    this.stopWaiter();
    const signal = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2));
    this.#signal = signal;
    this.#waiterPort = this.#deps.startWorker(COUNTER_WORKER_SOURCE, {
      onReply: (data) => {
        const kind = counterKind(data);
        if (kind === 'waiting') this.waiter = { kind: 'waiting' };
        if (kind === 'woke') this.waiter = { kind: 'woke', result: wakeResult(data) };
      },
      onCrash: (message) => {
        this.failure = message;
        this.stopWaiter();
      },
    });
    this.#waiterPort.post({ cells: signal, mode: 'wait', times: 0 }, []);
  }

  wake(): number {
    const signal = this.#signal;
    if (signal === null) return 0;
    Atomics.store(signal, SIGNAL_CELL, 1);
    return Atomics.notify(signal, SIGNAL_CELL, 1);
  }

  stopWaiter(): void {
    this.#waiterPort?.stop();
    this.#waiterPort = null;
    this.#signal = null;
    this.waiter = { kind: 'idle' };
  }
}

export { ADDS_PER_WORKER, COUNTING_WORKERS, SharedCounter, counterKind, wakeResult };
export type { CountMode, CountRun, CounterDeps, WaiterState };
