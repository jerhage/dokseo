import { browserFileSaving, saveFile } from '$lib/platform/files/save-file';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import { exportOffer, heldFile, preparedState, settledState } from './book-captures-export-rules';
import type {
  BookCapturesExportState,
  BookCapturesFileRead,
  ExportOffer,
} from './book-captures-export-rules';
import type { BookId } from './ids';

type BookCapturesExporting = {
  readonly exportBookCaptures: (id: BookId) => Promise<BookCapturesFileRead>;
};

type SaveFile = (file: FileToSave) => Promise<SaveFileOutcome>;

const UNPREPARED: BookCapturesExportState = { kind: 'unprepared' };

const PREPARING: BookCapturesExportState = { kind: 'preparing' };

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

export { BookCapturesExport };
export type { BookCapturesExporting, SaveFile };
