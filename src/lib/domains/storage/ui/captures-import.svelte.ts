import type { FileLike, FileSelection } from '$lib/ui/components/file-selection';
import type {
  ApplyCapturesImportResult,
  ConflictResolution,
} from '../use-cases/apply-captures-import';
import type { CapturesImportPlan } from '../use-cases/captures-import-plan';
import type { PreviewCapturesImportResult } from '../use-cases/preview-captures-import';
import {
  IDLE,
  IMPORTING,
  NOT_AN_EXPORT,
  READING,
  applied,
  isBusy,
  previewed,
} from './captures-import-rules';
import type { CapturesImportState } from './captures-import-rules';

type CapturesImporting = {
  readonly previewCapturesImport: (text: string) => Promise<PreviewCapturesImportResult>;
  readonly applyCapturesImport: (
    plan: CapturesImportPlan,
    resolution: ConflictResolution,
  ) => Promise<ApplyCapturesImportResult>;
};

type RefreshCache = () => Promise<unknown>;

type ImportFile = FileLike & { readonly text: () => Promise<string> };

class CapturesImport {
  #state = $state.raw<CapturesImportState>(IDLE);
  #importing: CapturesImporting;
  #refresh: RefreshCache;

  constructor(importing: CapturesImporting, refresh: RefreshCache) {
    this.#importing = importing;
    this.#refresh = refresh;
  }

  get state(): CapturesImportState {
    return this.#state;
  }

  async choose(selection: FileSelection<ImportFile>): Promise<void> {
    if (isBusy(this.#state)) return;
    const [file] = selection.accepted;
    if (file === undefined) {
      if (selection.rejected.length > 0) this.#state = NOT_AN_EXPORT;
      return;
    }
    this.#state = READING;
    try {
      const text = await file.text();
      const result = await this.#importing.previewCapturesImport(text);
      this.#state = previewed(result);
    } catch (error) {
      this.#state = IDLE;
      throw error;
    }
  }

  cancel(): void {
    if (isBusy(this.#state)) return;
    this.#state = IDLE;
  }

  async importNow(resolution: ConflictResolution): Promise<void> {
    const state = this.#state;
    if (state.kind !== 'preview') return;
    this.#state = IMPORTING;
    try {
      const result = await this.#importing.applyCapturesImport(state.plan, resolution);
      this.#state = applied(result);
    } catch (error) {
      this.#state = IDLE;
      throw error;
    } finally {
      await this.#refresh();
    }
  }
}

export { CapturesImport };
export type { CapturesImporting, ImportFile, RefreshCache };
