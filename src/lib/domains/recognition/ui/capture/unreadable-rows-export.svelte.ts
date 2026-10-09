import { browserFileSaving, saveFile } from '$lib/platform/files/save-file';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import type { UnreadableCapture } from '../../domain/capture/capture';
import type { UnreadableTag } from '../../domain/tag/tag';
import { IDLE, settledState } from './unreadable-rows-rules';
import type { UnreadableRowsFileBuilt, UnreadableRowsSaveState } from './unreadable-rows-rules';

type UnreadableRows = {
  readonly captures: readonly UnreadableCapture[];
  readonly tags: readonly UnreadableTag[];
};

type UnreadableRowsExporting = {
  readonly exportUnreadableRows: (rows: UnreadableRows) => UnreadableRowsFileBuilt;
};

type SaveFile = (file: FileToSave) => Promise<SaveFileOutcome>;

const SAVING: UnreadableRowsSaveState = { kind: 'saving' };

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

export { UnreadableRowsExport };
export type { SaveFile, UnreadableRows, UnreadableRowsExporting };
