import { match } from 'ts-pattern';
import { browserFileSaving, saveFile } from '$lib/platform/files/save-file';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import type { BookId } from './ids';
import type { StorageUnavailable } from './storage-unavailable';

type BookCapturesFile = {
  readonly file: FileToSave;
  readonly captures: number;
};

type BookCapturesFileRead =
  | { readonly kind: 'success'; readonly exported: BookCapturesFile }
  | { readonly kind: 'nothing-to-export' }
  | StorageUnavailable;

type BookCapturesExporting = {
  readonly exportBookCaptures: (id: BookId) => Promise<BookCapturesFileRead>;
};

type SaveFile = (file: FileToSave) => Promise<SaveFileOutcome>;

type BookCapturesExportState =
  | { readonly kind: 'unprepared' }
  | { readonly kind: 'preparing' }
  | { readonly kind: 'nothing-to-export' }
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'ready'; readonly exported: BookCapturesFile }
  | { readonly kind: 'saving'; readonly exported: BookCapturesFile }
  | { readonly kind: 'needs-another-tap'; readonly exported: BookCapturesFile }
  | { readonly kind: 'saved'; readonly exported: BookCapturesFile };

type ExportOffer =
  | { readonly kind: 'none' }
  | { readonly kind: 'export'; readonly busy: boolean; readonly confirmation: string | null }
  | { readonly kind: 'another-tap'; readonly prompt: string };

const UNPREPARED: BookCapturesExportState = { kind: 'unprepared' };

const PREPARING: BookCapturesExportState = { kind: 'preparing' };

const NO_OFFER: ExportOffer = { kind: 'none' };

const ANOTHER_TAP_PROMPT = 'The file is ready. Tap Save file to choose where it goes.';

function savedCapturesText(count: number): string {
  return `Saved ${count} ${count === 1 ? 'capture' : 'captures'}.`;
}

function preparedState(read: BookCapturesFileRead): BookCapturesExportState {
  return match(read)
    .returnType<BookCapturesExportState>()
    .with({ kind: 'success' }, ({ exported }) => ({ kind: 'ready', exported }))
    .with({ kind: 'nothing-to-export' }, () => ({ kind: 'nothing-to-export' }))
    .with({ kind: 'storage-unavailable' }, () => ({ kind: 'storage-unavailable' }))
    .exhaustive();
}

function settledState(
  outcome: SaveFileOutcome,
  exported: BookCapturesFile,
): BookCapturesExportState {
  return match(outcome)
    .returnType<BookCapturesExportState>()
    .with({ kind: 'shared' }, { kind: 'downloaded' }, () => ({ kind: 'saved', exported }))
    .with({ kind: 'cancelled' }, () => ({ kind: 'ready', exported }))
    .with({ kind: 'needs-another-tap' }, () => ({ kind: 'needs-another-tap', exported }))
    .exhaustive();
}

function heldFile(state: BookCapturesExportState): BookCapturesFile | null {
  return match(state)
    .with(
      { kind: 'unprepared' },
      { kind: 'preparing' },
      { kind: 'nothing-to-export' },
      { kind: 'storage-unavailable' },
      { kind: 'saving' },
      () => null,
    )
    .with(
      { kind: 'ready' },
      { kind: 'needs-another-tap' },
      { kind: 'saved' },
      ({ exported }) => exported,
    )
    .exhaustive();
}

function exportOffer(state: BookCapturesExportState): ExportOffer {
  return match(state)
    .returnType<ExportOffer>()
    .with(
      { kind: 'unprepared' },
      { kind: 'preparing' },
      { kind: 'nothing-to-export' },
      { kind: 'storage-unavailable' },
      () => NO_OFFER,
    )
    .with({ kind: 'ready' }, () => ({ kind: 'export', busy: false, confirmation: null }))
    .with({ kind: 'saving' }, () => ({ kind: 'export', busy: true, confirmation: null }))
    .with({ kind: 'saved' }, ({ exported }) => ({
      kind: 'export',
      busy: false,
      confirmation: savedCapturesText(exported.captures),
    }))
    .with({ kind: 'needs-another-tap' }, () => ({
      kind: 'another-tap',
      prompt: ANOTHER_TAP_PROMPT,
    }))
    .exhaustive();
}

function saveInBrowser(file: FileToSave): Promise<SaveFileOutcome> {
  return saveFile(browserFileSaving(), file);
}

class BookCapturesExport {
  #state = $state.raw<BookCapturesExportState>(UNPREPARED);
  #offer = $derived(exportOffer(this.#state));
  #exporting: BookCapturesExporting;
  #save: SaveFile;
  #round = 0;

  constructor(exporting: BookCapturesExporting, save: SaveFile = saveInBrowser) {
    this.#exporting = exporting;
    this.#save = save;
  }

  get state(): BookCapturesExportState {
    return this.#state;
  }

  get offer(): ExportOffer {
    return this.#offer;
  }

  async ensurePrepared(book: BookId): Promise<void> {
    if (this.#state.kind !== 'unprepared') return;
    await this.prepare(book);
  }

  async prepare(book: BookId): Promise<void> {
    this.#round += 1;
    const round = this.#round;
    this.#state = PREPARING;
    try {
      const read = await this.#exporting.exportBookCaptures(book);
      if (round === this.#round) this.#state = preparedState(read);
    } catch (error) {
      if (round === this.#round) this.#state = UNPREPARED;
      throw error;
    }
  }

  async save(): Promise<void> {
    const exported = heldFile(this.#state);
    if (exported === null) return;
    const round = this.#round;
    this.#state = { kind: 'saving', exported };
    try {
      const outcome = await this.#save(exported.file);
      if (round === this.#round) this.#state = settledState(outcome, exported);
    } catch (error) {
      if (round === this.#round) this.#state = { kind: 'ready', exported };
      throw error;
    }
  }
}

export { ANOTHER_TAP_PROMPT, BookCapturesExport, exportOffer, savedCapturesText };
export type {
  BookCapturesExportState,
  BookCapturesExporting,
  BookCapturesFile,
  BookCapturesFileRead,
  ExportOffer,
  SaveFile,
};
