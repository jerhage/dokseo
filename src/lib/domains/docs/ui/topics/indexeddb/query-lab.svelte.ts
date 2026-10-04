import { describeCause } from '$lib/shared/cause';
import type { QueryResult } from '../../../domain/indexeddb-format';
import type { QueryPresetKey } from '../../../domain/indexeddb-samples';

type LabCounts = { readonly books: number; readonly captures: number };

type QueryLabStore = {
  exists(): Promise<boolean | null>;
  counts(): Promise<LabCounts>;
  fill(): Promise<void>;
  run(key: QueryPresetKey): Promise<QueryResult>;
  clash(note: (line: string) => void): Promise<number>;
  move(from: string, to: string): Promise<number>;
  remove(): Promise<void>;
};

type LabState =
  | { readonly kind: 'reading' }
  | { readonly kind: 'absent' }
  | { readonly kind: 'ready'; readonly counts: LabCounts }
  | { readonly kind: 'failed'; readonly message: string };

type ShownResult = { readonly preset: QueryPresetKey; readonly result: QueryResult };

class QueryLab {
  #state = $state.raw<LabState>({ kind: 'reading' });
  #preset = $state<QueryPresetKey>('store-all');
  #shown = $state.raw<ShownResult | null>(null);
  #log = $state.raw<readonly string[]>([]);
  #busy = $state(false);
  #created = false;
  readonly #store: QueryLabStore;

  constructor(store: QueryLabStore) {
    this.#store = store;
  }

  get state(): LabState {
    return this.#state;
  }

  get preset(): QueryPresetKey {
    return this.#preset;
  }

  get shown(): ShownResult | null {
    return this.#shown;
  }

  get log(): readonly string[] {
    return this.#log;
  }

  get busy(): boolean {
    return this.#busy;
  }

  refresh(): Promise<void> {
    return this.#run(() => Promise.resolve());
  }

  fill(): Promise<void> {
    return this.#run(async () => {
      await this.#store.fill();
      this.#created = true;
      this.#log = ['one readwrite transaction cleared both stores and added the sample rows'];
      await this.#query(this.#preset);
    });
  }

  choose(preset: QueryPresetKey): Promise<void> {
    this.#preset = preset;
    if (this.#state.kind !== 'ready') return Promise.resolve();
    return this.#run(() => this.#query(preset));
  }

  clash(): Promise<void> {
    return this.#run(async () => {
      const lines: string[] = [];
      const books = await this.#store.clash((line) => lines.push(line));
      this.#log = [...lines, `books in the store afterwards: ${books}`];
    });
  }

  move(from: string, to: string): Promise<void> {
    return this.#run(async () => {
      const held = await this.#store.move(from, to);
      this.#log = [
        `rewriteByIndex moved every '${from}' capture to '${to}' in one transaction; '${to}' now holds ${held}`,
      ];
      await this.#query(this.#preset);
    });
  }

  remove(): Promise<void> {
    return this.#run(async () => {
      await this.#store.remove();
      this.#created = false;
      this.#shown = null;
      this.#log = ['deleteDatabase succeeded'];
    });
  }

  async #query(preset: QueryPresetKey): Promise<void> {
    const result = await this.#store.run(preset);
    this.#shown = { preset, result };
  }

  async #run(work: () => Promise<void>): Promise<void> {
    if (this.#busy) return;
    this.#busy = true;
    try {
      await work();
      const exists = (await this.#store.exists()) ?? this.#created;
      this.#state = exists
        ? { kind: 'ready', counts: await this.#store.counts() }
        : { kind: 'absent' };
    } catch (cause) {
      this.#state = { kind: 'failed', message: describeCause(cause) };
    } finally {
      this.#busy = false;
    }
  }
}

export { QueryLab };
export type { LabCounts, LabState, QueryLabStore, ShownResult };
