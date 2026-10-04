import { match } from 'ts-pattern';
import { SvelteMap } from 'svelte/reactivity';
import { RequestLedger } from '../../../domain/request-ledger';
import { ECHO_WORKER_SOURCE, errorParts } from './demo-workers';
import type { DemoPort, StartDemoWorker } from './demo-workers';
import type { PostSample } from './post-samples';

type PostOutcome =
  | { readonly kind: 'posting' }
  | { readonly kind: 'arrived'; readonly description: string }
  | { readonly kind: 'threw'; readonly name: string; readonly message: string }
  | { readonly kind: 'lost'; readonly cause: string };

function echoReply(data: unknown): { id: number; description: string } | null {
  if (typeof data !== 'object' || data === null) return null;
  if (!('id' in data) || !('description' in data)) return null;
  if (typeof data.id !== 'number' || typeof data.description !== 'string') return null;
  return { id: data.id, description: data.description };
}

class PostTester {
  outcomes = new SvelteMap<string, PostOutcome>();

  #start: StartDemoWorker;
  #ledger = new RequestLedger<string>();
  #port: DemoPort | null = null;

  constructor(start: StartDemoWorker) {
    this.#start = start;
  }

  async post(sample: PostSample): Promise<void> {
    const port = this.#echo();
    const { id, outcome } = this.#ledger.open();
    this.outcomes.set(sample.name, { kind: 'posting' });
    try {
      port.post({ id, value: sample.make() }, []);
    } catch (cause) {
      this.#ledger.refuse(id, '');
      this.outcomes.set(sample.name, { kind: 'threw', ...errorParts(cause) });
      return;
    }
    const settled = await outcome;
    const shown = match(settled)
      .returnType<PostOutcome>()
      .with({ kind: 'answered' }, (answered) => ({ kind: 'arrived', description: answered.value }))
      .with({ kind: 'refused' }, (refused) => ({ kind: 'lost', cause: refused.message }))
      .with({ kind: 'abandoned' }, (abandoned) => ({ kind: 'lost', cause: abandoned.cause }))
      .exhaustive();
    this.outcomes.set(sample.name, shown);
  }

  async postAll(samples: readonly PostSample[]): Promise<void> {
    await Promise.all(samples.map((sample) => this.post(sample)));
  }

  dispose(): void {
    this.#port?.stop();
    this.#port = null;
    this.#ledger.abandonAll('The demo closed');
  }

  #echo(): DemoPort {
    if (this.#port !== null) return this.#port;
    const port = this.#start(ECHO_WORKER_SOURCE, {
      onReply: (data) => {
        const reply = echoReply(data);
        if (reply !== null) this.#ledger.answer(reply.id, reply.description);
      },
      onCrash: (message) => {
        this.#port?.stop();
        this.#port = null;
        this.#ledger.abandonAll(message);
      },
    });
    this.#port = port;
    return port;
  }
}

export { PostTester, echoReply };
export type { PostOutcome };
