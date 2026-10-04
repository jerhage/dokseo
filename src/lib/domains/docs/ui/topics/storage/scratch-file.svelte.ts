import { describeCause } from '$lib/shared/cause';
import { SCRATCH_DIRECTORY, SCRATCH_FILE } from './scratch-file-protocol';
import type { RootEntry, ScratchFileContent, ScratchFileStore } from './scratch-file';

type ScratchFileState =
  | { readonly kind: 'reading' }
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'absent' }
  | { readonly kind: 'present'; readonly content: ScratchFileContent }
  | { readonly kind: 'failed'; readonly message: string };

type ScratchFileDeps = {
  readonly store: ScratchFileStore;
  readonly now: () => number;
};

const SCRATCH_PATH = `${SCRATCH_DIRECTORY}/${SCRATCH_FILE}`;

function noteText(at: number): string {
  return `Written by the Dokseo storage page at ${new Date(at).toISOString()}`;
}

class ScratchFile {
  #state = $state.raw<ScratchFileState>({ kind: 'reading' });
  #root = $state.raw<readonly RootEntry[]>([]);
  #written = $state.raw<number | null>(null);
  #busy = $state(false);
  readonly #deps: ScratchFileDeps;

  constructor(deps: ScratchFileDeps) {
    this.#deps = deps;
  }

  get state(): ScratchFileState {
    return this.#state;
  }

  get root(): readonly RootEntry[] {
    return this.#root;
  }

  get written(): number | null {
    return this.#written;
  }

  get busy(): boolean {
    return this.#busy;
  }

  refresh(): Promise<void> {
    return this.#run(() => Promise.resolve());
  }

  write(): Promise<void> {
    return this.#run(async () => {
      this.#written = await this.#deps.store.write(noteText(this.#deps.now()));
    });
  }

  remove(): Promise<void> {
    return this.#run(async () => {
      await this.#deps.store.remove();
      this.#written = null;
    });
  }

  async #run(work: () => Promise<void>): Promise<void> {
    if (this.#busy) return;
    if (!this.#deps.store.available()) {
      this.#state = { kind: 'unsupported' };
      return;
    }
    this.#busy = true;
    try {
      await work();
      const content = await this.#deps.store.read();
      this.#root = await this.#deps.store.root();
      this.#state = content === null ? { kind: 'absent' } : { kind: 'present', content };
    } catch (cause) {
      this.#state = { kind: 'failed', message: describeCause(cause) };
    } finally {
      this.#busy = false;
    }
  }
}

export { SCRATCH_PATH, ScratchFile, noteText };
export type { ScratchFileDeps, ScratchFileState };
