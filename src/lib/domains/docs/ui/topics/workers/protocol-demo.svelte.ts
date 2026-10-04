import { match } from 'ts-pattern';
import { ROOT_WORKER_SOURCE, rootReply } from '../../../domain/demo-protocol';
import type { RootRequest } from '../../../domain/demo-protocol';
import { RequestLedger } from '../../../domain/request-ledger';
import type { LedgerOutcome } from '../../../domain/request-ledger';
import type { DemoPort, StartDemoWorker } from './demo-workers';

type RowState =
  | { readonly kind: 'waiting' }
  | { readonly kind: 'answered'; readonly root: number; readonly arrival: number }
  | { readonly kind: 'refused'; readonly message: string; readonly arrival: number }
  | { readonly kind: 'abandoned'; readonly cause: string };

type RequestRow = {
  readonly id: number;
  readonly value: number;
  readonly delayMs: number;
  readonly state: RowState;
};

type PlannedRequest = { readonly value: number; readonly delayMs: number };

const BATCH: readonly PlannedRequest[] = [
  { value: 9, delayMs: 900 },
  { value: 81, delayMs: 300 },
  { value: -4, delayMs: 600 },
  { value: 2, delayMs: 100 },
];

const TERMINATED = 'terminate() ended the worker before it replied';

class ProtocolDemo {
  rows = $state.raw<readonly RequestRow[]>([]);
  crash = $state<string | null>(null);

  #start: StartDemoWorker;
  #ledger = new RequestLedger<number>();
  #port: DemoPort | null = null;
  #arrivals = 0;

  constructor(start: StartDemoWorker) {
    this.#start = start;
  }

  async sendBatch(crashAfter: boolean, batch: readonly PlannedRequest[] = BATCH): Promise<void> {
    const port = this.#worker();
    this.crash = null;
    this.rows = [];
    this.#arrivals = 0;
    const sent = batch.map((planned) => this.#send(port, planned));
    if (crashAfter) {
      const request: RootRequest = { kind: 'crash' };
      port.post(request, []);
    }
    await Promise.all(sent);
  }

  terminate(): void {
    this.#discard(TERMINATED);
  }

  async #send(port: DemoPort, planned: PlannedRequest): Promise<void> {
    const { id, outcome } = this.#ledger.open();
    this.rows = [...this.rows, { id, ...planned, state: { kind: 'waiting' } }];
    const request: RootRequest = { kind: 'root', id, ...planned };
    port.post(request, []);
    const settled = await outcome;
    this.#show(id, this.#stateOf(settled));
  }

  #stateOf(settled: LedgerOutcome<number>): RowState {
    return match(settled)
      .returnType<RowState>()
      .with({ kind: 'answered' }, (answered) => {
        this.#arrivals += 1;
        return { kind: 'answered', root: answered.value, arrival: this.#arrivals };
      })
      .with({ kind: 'refused' }, (refused) => {
        this.#arrivals += 1;
        return { kind: 'refused', message: refused.message, arrival: this.#arrivals };
      })
      .with({ kind: 'abandoned' }, (abandoned) => ({ kind: 'abandoned', cause: abandoned.cause }))
      .exhaustive();
  }

  #show(id: number, state: RowState): void {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, state } : row));
  }

  #worker(): DemoPort {
    if (this.#port !== null) return this.#port;
    const port = this.#start(ROOT_WORKER_SOURCE, {
      onReply: (data) => {
        const reply = rootReply(data);
        if (reply === null) return;
        if (reply.kind === 'rooted') this.#ledger.answer(reply.id, reply.root);
        else this.#ledger.refuse(reply.id, reply.message);
      },
      onCrash: (message) => {
        this.crash = message;
        this.#discard(message);
      },
    });
    this.#port = port;
    return port;
  }

  #discard(cause: string): void {
    this.#port?.stop();
    this.#port = null;
    this.#ledger.abandonAll(cause);
  }
}

export { BATCH, ProtocolDemo, TERMINATED };
export type { PlannedRequest, RequestRow, RowState };
