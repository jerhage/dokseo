import { match } from 'ts-pattern';
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

type ConflictStrategy = 'newer' | 'this-device' | 'review';

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
  | { readonly kind: 'preview'; readonly plan: CapturesImportPlan }
  | { readonly kind: 'importing' }
  | { readonly kind: 'imported'; readonly counts: CapturesImportCounts };

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

function resolutionOf(strategy: ConflictStrategy, choices: ConflictChoices): ConflictResolution {
  return match(strategy)
    .returnType<ConflictResolution>()
    .with('newer', () => ({ kind: 'newer' }))
    .with('this-device', () => ({ kind: 'this-device' }))
    .with('review', () => ({ kind: 'review', choices }))
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
    .with({ kind: 'success' }, ({ plan }) => ({ kind: 'preview', plan }))
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

export {
  IDLE,
  IMPORTING,
  NOT_AN_EXPORT,
  NO_CHOICES,
  READING,
  applied,
  conflictsOf,
  draftFor,
  isBusy,
  noteOf,
  previewed,
  resolutionOf,
  sideOf,
  withChoice,
};
export type { CapturesImportState, ConflictChoices, ConflictDraft, ConflictSide, ConflictStrategy };
