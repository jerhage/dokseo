import { match } from 'ts-pattern';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import type { ExportCapturesResult } from '../use-cases/export-captures';
import { IDLE, fileOf, settled, summaryOf } from './captures-export-rules';
import type { CapturesExportState, ExportSummary } from './captures-export-rules';

type CapturesExporting = {
  readonly exportCaptures: () => Promise<ExportCapturesResult>;
};

type SaveFile = (file: FileToSave) => Promise<SaveFileOutcome>;

const EXPORTING: CapturesExportState = { kind: 'exporting' };

const STORAGE_UNAVAILABLE_STATE: CapturesExportState = {
  kind: 'storage-unavailable',
};

class CapturesExportView {
  #state = $state<CapturesExportState>(IDLE);
  #exporting: CapturesExporting;
  #save: SaveFile;

  constructor(exporting: CapturesExporting, save: SaveFile) {
    this.#exporting = exporting;
    this.#save = save;
  }

  get state(): CapturesExportState {
    return this.#state;
  }

  async export(): Promise<void> {
    if (this.#state.kind === 'exporting') return;
    this.#state = EXPORTING;
    try {
      const result = await this.#exporting.exportCaptures();
      const next = await match(result)
        .returnType<Promise<CapturesExportState>>()
        .with({ kind: 'success' }, ({ exported }) =>
          this.#saveFile(fileOf(exported), summaryOf(exported)),
        )
        .with({ kind: 'nothing-to-export' }, ({ bookless, unreadable }) =>
          Promise.resolve({
            kind: 'nothing-to-export',
            leftOut: { bookless, unreadable },
          }),
        )
        .with({ kind: 'storage-unavailable' }, () => Promise.resolve(STORAGE_UNAVAILABLE_STATE))
        .exhaustive();
      this.#state = next;
    } catch (error) {
      this.#state = IDLE;
      throw error;
    }
  }

  async saveAgain(): Promise<void> {
    const pending = this.#state;
    if (pending.kind !== 'needs-another-tap') return;
    try {
      this.#state = await this.#saveFile(pending.file, pending.summary);
    } catch (error) {
      this.#state = IDLE;
      throw error;
    }
  }

  async #saveFile(file: FileToSave, summary: ExportSummary): Promise<CapturesExportState> {
    const outcome = await this.#save(file);
    return settled(outcome, file, summary);
  }
}

export { CapturesExportView };
export type { CapturesExporting, SaveFile };
