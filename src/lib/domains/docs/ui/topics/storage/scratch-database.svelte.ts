import { describeCause } from '$lib/shared/cause';
import { SCRATCH_DATABASE, SCRATCH_STORE } from './scratch-database';
import type { DatabaseListing, ScratchDatabaseStore, ScratchNote } from './scratch-database';

type ScratchState =
  | { readonly kind: 'reading' }
  | { readonly kind: 'absent' }
  | { readonly kind: 'present'; readonly notes: readonly ScratchNote[] }
  | { readonly kind: 'failed'; readonly message: string };

type ScratchDatabaseDeps = {
  readonly store: ScratchDatabaseStore;
  readonly now: () => number;
};

const LOG_LENGTH = 5;

function isScratch(listing: DatabaseListing): boolean {
  return listing.name === SCRATCH_DATABASE;
}

class ScratchDatabase {
  #state = $state.raw<ScratchState>({ kind: 'reading' });
  #databases = $state.raw<readonly DatabaseListing[] | null>(null);
  #log = $state.raw<readonly string[]>([]);
  #busy = $state(false);
  #knownToExist = false;
  readonly #deps: ScratchDatabaseDeps;

  constructor(deps: ScratchDatabaseDeps) {
    this.#deps = deps;
  }

  get state(): ScratchState {
    return this.#state;
  }

  get appDatabases(): readonly DatabaseListing[] | null {
    return this.#databases?.filter((listing) => !isScratch(listing)) ?? null;
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

  create(): Promise<void> {
    return this.#run(async () => {
      const opening = await this.#deps.store.open();
      this.#knownToExist = true;
      this.#note(
        opening.kind === 'created'
          ? `upgradeneeded fired: version 0 to ${opening.version}, created the "${SCRATCH_STORE}" store`
          : `opened version ${opening.version}; no upgrade, the store already existed`,
      );
    });
  }

  add(): Promise<void> {
    return this.#run(async () => {
      const count = this.#state.kind === 'present' ? this.#state.notes.length : 0;
      await this.#deps.store.add(`Demo note ${count + 1}`, this.#deps.now());
      this.#knownToExist = true;
      this.#note('a readwrite transaction added one row and completed');
    });
  }

  remove(): Promise<void> {
    return this.#run(async () => {
      await this.#deps.store.remove();
      this.#knownToExist = false;
      this.#note(`deleteDatabase("${SCRATCH_DATABASE}") succeeded`);
    });
  }

  async #run(work: () => Promise<void>): Promise<void> {
    if (this.#busy) return;
    this.#busy = true;
    try {
      await work();
      await this.#read();
    } catch (cause) {
      this.#state = { kind: 'failed', message: describeCause(cause) };
    } finally {
      this.#busy = false;
    }
  }

  async #read(): Promise<void> {
    const databases = await this.#deps.store.databases();
    this.#databases = databases;
    const exists = databases === null ? this.#knownToExist : databases.some(isScratch);
    this.#state = exists
      ? { kind: 'present', notes: await this.#deps.store.notes() }
      : { kind: 'absent' };
  }

  #note(entry: string): void {
    this.#log = [entry, ...this.#log].slice(0, LOG_LENGTH);
  }
}

export { ScratchDatabase };
export type { ScratchDatabaseDeps, ScratchState };
