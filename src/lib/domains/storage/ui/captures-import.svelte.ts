import { match } from 'ts-pattern';
import type { FileLike, FileSelection } from '$lib/ui/components/file-selection';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { CaptureId } from '$lib/shared/ids';
import type {
  ApplyCapturesImportResult,
  CapturesImportCounts,
  ConflictChoice,
  ConflictResolution,
} from '../use-cases/apply-captures-import';
import type { CaptureConflict, CapturesImportPlan } from '../use-cases/captures-import-plan';
import type { PreviewCapturesImportResult } from '../use-cases/preview-captures-import';

type CapturesImporting = {
  readonly previewCapturesImport: (text: string) => Promise<PreviewCapturesImportResult>;
  readonly applyCapturesImport: (
    plan: CapturesImportPlan,
    resolution: ConflictResolution,
  ) => Promise<ApplyCapturesImportResult>;
};

type RefreshCache = () => Promise<unknown>;

type ImportFile = FileLike & { readonly text: () => Promise<string> };

type ConflictStrategy = 'newer' | 'this-device' | 'review';

type WholeStrategy = Exclude<ConflictStrategy, 'review'>;

type ConflictSide = 'device' | 'file';

type ConflictChoices = ReadonlyMap<CaptureId, ConflictChoice>;

type ConflictDraft = {
  readonly id: CaptureId;
  readonly text: string;
  readonly note: string;
};

type CapturesImportState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'reading' }
  | { readonly kind: 'not-an-export' }
  | { readonly kind: 'newer-version'; readonly version: number }
  | { readonly kind: 'storage-unavailable' }
  | {
      readonly kind: 'preview';
      readonly plan: CapturesImportPlan;
      readonly strategy: WholeStrategy;
      readonly choices: ConflictChoices;
    }
  | {
      readonly kind: 'reviewing';
      readonly plan: CapturesImportPlan;
      readonly choices: ConflictChoices;
      readonly draft: ConflictDraft | null;
    }
  | { readonly kind: 'importing' }
  | { readonly kind: 'imported'; readonly counts: CapturesImportCounts };

type PlannedState = Extract<CapturesImportState, { readonly kind: 'preview' | 'reviewing' }>;

const IDLE: CapturesImportState = { kind: 'idle' };

const READING: CapturesImportState = { kind: 'reading' };

const IMPORTING: CapturesImportState = { kind: 'importing' };

const NOT_AN_EXPORT: CapturesImportState = { kind: 'not-an-export' };

const NO_CHOICES: ConflictChoices = new Map();

function conflictsOf(plan: CapturesImportPlan): readonly CaptureConflict[] {
  return plan.captures.flatMap((planned) =>
    planned.kind === 'conflict' ? [planned.conflict] : [],
  );
}

function noteOf(capture: Capture): string | null {
  return 'note' in capture ? capture.note : null;
}

function strategyOf(state: CapturesImportState): ConflictStrategy {
  return match(state)
    .returnType<ConflictStrategy>()
    .with({ kind: 'preview' }, ({ strategy }) => strategy)
    .with({ kind: 'reviewing' }, () => 'review')
    .with(
      { kind: 'idle' },
      { kind: 'reading' },
      { kind: 'not-an-export' },
      { kind: 'newer-version' },
      { kind: 'storage-unavailable' },
      { kind: 'importing' },
      { kind: 'imported' },
      () => 'newer',
    )
    .exhaustive();
}

function resolutionOf(state: PlannedState): ConflictResolution {
  return match(state)
    .returnType<ConflictResolution>()
    .with({ kind: 'preview', strategy: 'newer' }, () => ({ kind: 'newer' }))
    .with({ kind: 'preview', strategy: 'this-device' }, () => ({ kind: 'this-device' }))
    .with({ kind: 'reviewing' }, ({ choices }) => ({ kind: 'review', choices }))
    .exhaustive();
}

function sideOf(choice: ConflictChoice | undefined): ConflictChoice['kind'] | null {
  return choice === undefined ? null : choice.kind;
}

function withChoice(
  choices: ConflictChoices,
  id: CaptureId,
  choice: ConflictChoice,
): ConflictChoices {
  return new Map([...choices, [id, choice]]);
}

function draftFor(conflict: CaptureConflict, choice: ConflictChoice | undefined): ConflictDraft {
  if (choice?.kind === 'edit') return { id: conflict.id, text: choice.text, note: choice.note };
  return {
    id: conflict.id,
    text: conflict.device.text,
    note: noteOf(conflict.device) ?? '',
  };
}

function previewed(result: PreviewCapturesImportResult): CapturesImportState {
  return match(result)
    .returnType<CapturesImportState>()
    .with({ kind: 'success' }, ({ plan }) => ({
      kind: 'preview',
      plan,
      strategy: 'newer',
      choices: NO_CHOICES,
    }))
    .with({ kind: 'not-an-export' }, () => NOT_AN_EXPORT)
    .with({ kind: 'newer-version' }, ({ version }) => ({ kind: 'newer-version', version }))
    .with({ kind: 'storage-unavailable' }, () => ({ kind: 'storage-unavailable' }))
    .exhaustive();
}

function applied(result: ApplyCapturesImportResult): CapturesImportState {
  return match(result)
    .returnType<CapturesImportState>()
    .with({ kind: 'imported' }, ({ counts }) => ({ kind: 'imported', counts }))
    .with({ kind: 'storage-unavailable' }, () => ({ kind: 'storage-unavailable' }))
    .exhaustive();
}

function isBusy(state: CapturesImportState): boolean {
  return state.kind === 'reading' || state.kind === 'importing';
}

class CapturesImportView {
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

  get strategy(): ConflictStrategy {
    return strategyOf(this.#state);
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

  pickStrategy(strategy: ConflictStrategy): void {
    const state = this.#state;
    if (state.kind !== 'preview' && state.kind !== 'reviewing') return;
    const { plan, choices } = state;
    this.#state =
      strategy === 'review'
        ? { kind: 'reviewing', plan, choices, draft: null }
        : { kind: 'preview', plan, strategy, choices };
  }

  pick(id: CaptureId, side: ConflictSide): void {
    const state = this.#state;
    if (state.kind !== 'reviewing') return;
    const choice: ConflictChoice = { kind: side };
    this.#state = { ...state, choices: withChoice(state.choices, id, choice) };
  }

  edit(id: CaptureId): void {
    const state = this.#state;
    if (state.kind !== 'reviewing') return;
    const conflict = conflictsOf(state.plan).find((candidate) => candidate.id === id);
    if (conflict === undefined) return;
    this.#state = { ...state, draft: draftFor(conflict, state.choices.get(id)) };
  }

  draftText(text: string): void {
    const state = this.#state;
    if (state.kind !== 'reviewing' || state.draft === null) return;
    this.#state = { ...state, draft: { ...state.draft, text } };
  }

  draftNote(note: string): void {
    const state = this.#state;
    if (state.kind !== 'reviewing' || state.draft === null) return;
    this.#state = { ...state, draft: { ...state.draft, note } };
  }

  saveDraft(): void {
    const state = this.#state;
    if (state.kind !== 'reviewing' || state.draft === null) return;
    const { id, text, note } = state.draft;
    const choices = withChoice(state.choices, id, { kind: 'edit', text, note });
    this.#state = { ...state, choices, draft: null };
  }

  cancelDraft(): void {
    const state = this.#state;
    if (state.kind !== 'reviewing') return;
    this.#state = { ...state, draft: null };
  }

  cancel(): void {
    if (isBusy(this.#state)) return;
    this.#state = IDLE;
  }

  async importNow(): Promise<void> {
    const state = this.#state;
    if (state.kind !== 'preview' && state.kind !== 'reviewing') return;
    const resolution = resolutionOf(state);
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

export { CapturesImportView, conflictsOf, noteOf, resolutionOf, sideOf, strategyOf };
export type {
  CapturesImportState,
  CapturesImporting,
  ConflictDraft,
  ConflictSide,
  ConflictStrategy,
  ImportFile,
  RefreshCache,
};
