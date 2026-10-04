import { match } from 'ts-pattern';
import { browserFileSaving, saveFile } from '$lib/platform/files/save-file';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import { ANOTHER_TAP_PROMPT } from '$lib/shared/book-captures-export.svelte';
import type { ExportOffer } from '$lib/shared/book-captures-export.svelte';
import type { UnreadableCapture } from '../../domain/capture/capture';
import type { UnreadableTag } from '../../domain/tag/tag';

type UnreadableRows = {
  readonly captures: readonly UnreadableCapture[];
  readonly tags: readonly UnreadableTag[];
};

type UnreadableRowsFile = {
  readonly file: FileToSave;
  readonly captures: number;
  readonly tags: number;
};

type UnreadableRowsFileBuilt =
  | { readonly kind: 'success'; readonly exported: UnreadableRowsFile }
  | { readonly kind: 'nothing-to-export' };

type UnreadableRowsExporting = {
  readonly exportUnreadableRows: (rows: UnreadableRows) => UnreadableRowsFileBuilt;
};

type SaveFile = (file: FileToSave) => Promise<SaveFileOutcome>;

type UnreadableRowsSaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'needs-another-tap' }
  | { readonly kind: 'saved'; readonly exported: UnreadableRowsFile };

const IDLE: UnreadableRowsSaveState = { kind: 'idle' };

const SAVING: UnreadableRowsSaveState = { kind: 'saving' };

const NO_OFFER: ExportOffer = { kind: 'none' };

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function savedRowsText(exported: UnreadableRowsFile): string {
  if (exported.tags === 0) {
    return `Saved ${counted(exported.captures, 'unreadable capture', 'unreadable captures')}.`;
  }
  if (exported.captures === 0) {
    return `Saved ${counted(exported.tags, 'unreadable tag', 'unreadable tags')}.`;
  }
  return `Saved ${counted(exported.captures + exported.tags, 'unreadable row', 'unreadable rows')}.`;
}

function unreadableRowsOffer(
  state: UnreadableRowsSaveState,
  built: UnreadableRowsFileBuilt,
): ExportOffer {
  if (built.kind === 'nothing-to-export') return NO_OFFER;
  return match(state)
    .returnType<ExportOffer>()
    .with({ kind: 'idle' }, () => ({ kind: 'export', busy: false, confirmation: null }))
    .with({ kind: 'saving' }, () => ({ kind: 'export', busy: true, confirmation: null }))
    .with({ kind: 'needs-another-tap' }, () => ({
      kind: 'another-tap',
      prompt: ANOTHER_TAP_PROMPT,
    }))
    .with({ kind: 'saved' }, ({ exported }) => ({
      kind: 'export',
      busy: false,
      confirmation: savedRowsText(exported),
    }))
    .exhaustive();
}

function settledState(
  outcome: SaveFileOutcome,
  exported: UnreadableRowsFile,
): UnreadableRowsSaveState {
  return match(outcome)
    .returnType<UnreadableRowsSaveState>()
    .with({ kind: 'shared' }, { kind: 'downloaded' }, () => ({ kind: 'saved', exported }))
    .with({ kind: 'cancelled' }, () => IDLE)
    .with({ kind: 'needs-another-tap' }, () => ({ kind: 'needs-another-tap' }))
    .exhaustive();
}

function saveInBrowser(file: FileToSave): Promise<SaveFileOutcome> {
  return saveFile(browserFileSaving(), file);
}

class UnreadableRowsExport {
  #state = $state.raw<UnreadableRowsSaveState>(IDLE);
  #save: SaveFile;

  constructor(save: SaveFile = saveInBrowser) {
    this.#save = save;
  }

  get state(): UnreadableRowsSaveState {
    return this.#state;
  }

  async save(built: UnreadableRowsFileBuilt): Promise<void> {
    if (built.kind === 'nothing-to-export' || this.#state.kind === 'saving') return;
    const { exported } = built;
    this.#state = SAVING;
    try {
      const outcome = await this.#save(exported.file);
      this.#state = settledState(outcome, exported);
    } catch (error) {
      this.#state = IDLE;
      throw error;
    }
  }
}

export { UnreadableRowsExport, savedRowsText, unreadableRowsOffer };
export type {
  SaveFile,
  UnreadableRows,
  UnreadableRowsExporting,
  UnreadableRowsFile,
  UnreadableRowsFileBuilt,
  UnreadableRowsSaveState,
};
