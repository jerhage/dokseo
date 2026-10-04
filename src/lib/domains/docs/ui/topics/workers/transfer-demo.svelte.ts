import { BUFFER_WORKER_SOURCE, errorParts, startForReply } from './demo-workers';
import type { StartDemoWorker } from './demo-workers';

type TransferWay = 'clone' | 'transfer';

type TransferResult = {
  readonly way: TransferWay;
  readonly megabytes: number;
  readonly postMs: number;
  readonly replyMs: number;
  readonly lengthBefore: number;
  readonly lengthAfter: number;
  readonly received: number;
};

type TransferDeps = {
  readonly now: () => number;
  readonly startWorker: StartDemoWorker;
};

const BUFFER_SIZES_MB = [16, 64, 256] as const;

const BYTES_PER_MB = 1024 * 1024;

function receivedLength(data: unknown): number | null {
  if (typeof data !== 'object' || data === null || !('byteLength' in data)) return null;
  return typeof data.byteLength === 'number' ? data.byteLength : null;
}

class TransferDemo {
  megabytes = $state<number>(BUFFER_SIZES_MB[1]);
  running = $state<TransferWay | null>(null);
  results = $state.raw<readonly TransferResult[]>([]);
  failure = $state<string | null>(null);

  #deps: TransferDeps;

  constructor(deps: TransferDeps) {
    this.#deps = deps;
  }

  async run(way: TransferWay): Promise<void> {
    if (this.running !== null) return;
    this.running = way;
    this.failure = null;
    const megabytes = this.megabytes;
    const { port, reply } = startForReply(this.#deps.startWorker, BUFFER_WORKER_SOURCE);
    try {
      const buffer = new ArrayBuffer(megabytes * BYTES_PER_MB);
      const lengthBefore = buffer.byteLength;
      const started = this.#deps.now();
      port.post(buffer, way === 'transfer' ? [buffer] : []);
      const postMs = this.#deps.now() - started;
      const received = receivedLength(await reply);
      const replyMs = this.#deps.now() - started;
      if (received === null) throw new Error('The worker sent a reply with no length');
      const result: TransferResult = {
        way,
        megabytes,
        postMs,
        replyMs,
        lengthBefore,
        lengthAfter: buffer.byteLength,
        received,
      };
      this.results = [result, ...this.results];
    } catch (cause) {
      const parts = errorParts(cause);
      this.failure = `${parts.name}: ${parts.message}`;
    } finally {
      port.stop();
      this.running = null;
    }
  }
}

export { BUFFER_SIZES_MB, TransferDemo, receivedLength };
export type { TransferDeps, TransferResult, TransferWay };
