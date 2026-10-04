import { countPrimes } from '../../../domain/busy-work';
import { describeValue } from '../../../domain/value-description';

type DemoListeners = {
  readonly onReply: (data: unknown) => void;
  readonly onCrash: (message: string) => void;
};

type DemoPort = {
  post(message: unknown, transfer: Transferable[]): void;
  stop(): void;
};

type StartDemoWorker = (source: string, listeners: DemoListeners) => DemoPort;

type AwaitedReply = { readonly port: DemoPort; readonly reply: Promise<unknown> };

const UNREADABLE_REPLY = 'A reply arrived that could not be deserialized';

const PRIMES_WORKER_SOURCE = `${countPrimes.toString()}

self.onmessage = (event) => {
  const started = performance.now();
  const count = countPrimes(event.data.below);
  postMessage({ count, workMs: performance.now() - started });
};
`;

const BUFFER_WORKER_SOURCE = `self.onmessage = (event) => {
  postMessage({ byteLength: event.data.byteLength });
};
`;

const ECHO_WORKER_SOURCE = `${describeValue.toString()}

self.onmessage = (event) => {
  postMessage({ id: event.data.id, description: describeValue(event.data.value) });
};
`;

const COUNTER_WORKER_SOURCE = `self.onmessage = (event) => {
  const { cells, mode, times } = event.data;
  if (mode === 'wait') {
    postMessage({ kind: 'waiting' });
    const result = Atomics.wait(cells, 1, 0, 30000);
    postMessage({ kind: 'woke', result });
    return;
  }
  for (let i = 0; i < times; i += 1) {
    if (mode === 'atomic') Atomics.add(cells, 0, 1);
    else cells[0] += 1;
  }
  postMessage({ kind: 'counted' });
};
`;

function startBlobWorker(source: string, listeners: DemoListeners): DemoPort {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const worker = new Worker(url);
  worker.addEventListener('message', (event: MessageEvent<unknown>) => {
    listeners.onReply(event.data);
  });
  worker.addEventListener('error', (event: ErrorEvent) => {
    event.preventDefault();
    listeners.onCrash(event.message);
  });
  worker.addEventListener('messageerror', () => {
    listeners.onCrash(UNREADABLE_REPLY);
  });
  return {
    post: (message, transfer) => {
      worker.postMessage(message, transfer);
    },
    stop: () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    },
  };
}

function startForReply(start: StartDemoWorker, source: string): AwaitedReply {
  const settle = {
    resolve: (_data: unknown): void => undefined,
    reject: (_failed: Error): void => undefined,
  };
  const reply = new Promise<unknown>((resolve, reject) => {
    settle.resolve = resolve;
    settle.reject = reject;
  });
  const port = start(source, {
    onReply: (data) => settle.resolve(data),
    onCrash: (message) => settle.reject(new Error(message)),
  });
  return { port, reply };
}

function errorParts(cause: unknown): { readonly name: string; readonly message: string } {
  if (cause instanceof Error) return { name: cause.name, message: cause.message };
  return { name: typeof cause, message: String(cause) };
}

export {
  BUFFER_WORKER_SOURCE,
  COUNTER_WORKER_SOURCE,
  ECHO_WORKER_SOURCE,
  PRIMES_WORKER_SOURCE,
  errorParts,
  startBlobWorker,
  startForReply,
};
export type { AwaitedReply, DemoListeners, DemoPort, StartDemoWorker };
