import { match } from 'ts-pattern';

type RaceStrategy = 'naive' | 'request-id' | 'abort';

type RaceRequest = {
  readonly id: number;
  readonly query: string;
  readonly delayMs: number;
};

type RaceEvent =
  | { readonly kind: 'sent'; readonly request: RaceRequest }
  | { readonly kind: 'shown'; readonly request: RaceRequest; readonly answer: string }
  | { readonly kind: 'dropped'; readonly request: RaceRequest; readonly latest: number }
  | { readonly kind: 'aborted'; readonly request: RaceRequest };

type Respond = (request: RaceRequest, signal: AbortSignal) => Promise<string>;

type RaceWatcher = {
  readonly show: (request: RaceRequest, answer: string) => void;
  readonly record: (event: RaceEvent) => void;
};

const SAMPLE_TITLES = ['Harbor Lights', 'Hanami', 'Harvest Moon', 'Hayate', 'Haru', 'Night Ferry'];

function matchingTitles(query: string): readonly string[] {
  const folded = query.toLowerCase();
  return SAMPLE_TITLES.filter((title) => title.toLowerCase().startsWith(folded));
}

function answerFor(query: string): string {
  const titles = matchingTitles(query);
  return titles.length === 0 ? 'No titles' : titles.join(', ');
}

function abortsEarlier(strategy: RaceStrategy): boolean {
  return match(strategy)
    .with('naive', 'request-id', () => false)
    .with('abort', () => true)
    .exhaustive();
}

function keepsAnswer(strategy: RaceStrategy, id: number, latest: number): boolean {
  return match(strategy)
    .with('naive', 'abort', () => true)
    .with('request-id', () => id === latest)
    .exhaustive();
}

function delayedAnswer(request: RaceRequest, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const stop = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', stop);
      resolve(answerFor(request.query));
    }, request.delayMs);
    signal.addEventListener('abort', stop, { once: true });
  });
}

class RaceSearch {
  #strategy: RaceStrategy;
  #respond: Respond;
  #watcher: RaceWatcher;
  #latest = 0;
  #controller: AbortController | null = null;

  constructor(strategy: RaceStrategy, respond: Respond, watcher: RaceWatcher) {
    this.#strategy = strategy;
    this.#respond = respond;
    this.#watcher = watcher;
  }

  async send(query: string, delayMs: number): Promise<void> {
    this.#latest += 1;
    const request: RaceRequest = { id: this.#latest, query, delayMs };
    if (abortsEarlier(this.#strategy)) this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.#watcher.record({ kind: 'sent', request });

    let answer: string;
    try {
      answer = await this.#respond(request, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) throw error;
      this.#watcher.record({ kind: 'aborted', request });
      return;
    }

    if (!keepsAnswer(this.#strategy, request.id, this.#latest)) {
      this.#watcher.record({ kind: 'dropped', request, latest: this.#latest });
      return;
    }
    this.#watcher.show(request, answer);
    this.#watcher.record({ kind: 'shown', request, answer });
  }
}

export { RaceSearch, SAMPLE_TITLES, abortsEarlier, answerFor, delayedAnswer, keepsAnswer };
export type { RaceEvent, RaceRequest, RaceStrategy, RaceWatcher, Respond };
