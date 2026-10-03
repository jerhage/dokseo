import { match } from 'ts-pattern';
import { addRemovedBook } from '$lib/domains/library/use-cases/add-removed-book';
import type { AddRemovedBookDeps } from '$lib/domains/library/use-cases/add-removed-book';
import { editedCapture, notedCapture } from '$lib/domains/recognition/domain/capture/capture';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { restoreCapture } from '$lib/domains/recognition/use-cases/capture/restore-capture';
import type { RestoreCaptureDeps } from '$lib/domains/recognition/use-cases/capture/restore-capture';
import { restoreTag } from '$lib/domains/recognition/use-cases/tag/restore-tag';
import type { RestoreTagDeps } from '$lib/domains/recognition/use-cases/tag/restore-tag';
import type { CaptureId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureConflict, CapturesImportPlan, PlannedCapture } from './captures-import-plan';

type ConflictChoice =
  | { readonly kind: 'device' }
  | { readonly kind: 'file' }
  | { readonly kind: 'edit'; readonly text: string; readonly note: string };

type ConflictResolution =
  | { readonly kind: 'newer' }
  | { readonly kind: 'this-device' }
  | { readonly kind: 'review'; readonly choices: ReadonlyMap<CaptureId, ConflictChoice> };

type CapturesImportCounts = {
  readonly added: number;
  readonly updated: number;
  readonly kept: number;
  readonly held: number;
  readonly tagsCreated: number;
};

type ApplyCapturesImportResult =
  | { readonly kind: 'imported'; readonly counts: CapturesImportCounts }
  | StorageUnavailable;

type ApplyCapturesImportDeps = {
  readonly holding: AddRemovedBookDeps;
  readonly tagging: RestoreTagDeps;
  readonly saving: RestoreCaptureDeps;
  readonly now: () => number;
};

type CaptureOutcome =
  | { readonly kind: 'added'; readonly capture: Capture; readonly onShelf: boolean }
  | { readonly kind: 'updated'; readonly capture: Capture }
  | { readonly kind: 'kept-merging-tags'; readonly capture: Capture }
  | { readonly kind: 'kept' }
  | { readonly kind: 'unchanged' };

const DEVICE: ConflictChoice = { kind: 'device' };

const FILE: ConflictChoice = { kind: 'file' };

function lastChanged(capture: Capture): number {
  return capture.editedAt ?? capture.createdAt;
}

function newerSide(conflict: CaptureConflict): ConflictChoice {
  return lastChanged(conflict.file) > lastChanged(conflict.device) ? FILE : DEVICE;
}

function choiceFor(resolution: ConflictResolution, conflict: CaptureConflict): ConflictChoice {
  return match(resolution)
    .with({ kind: 'newer' }, () => newerSide(conflict))
    .with({ kind: 'this-device' }, () => DEVICE)
    .with({ kind: 'review' }, ({ choices }) => choices.get(conflict.id) ?? DEVICE)
    .exhaustive();
}

function withNote(capture: Capture, note: string): Capture {
  return match(capture)
    .returnType<Capture>()
    .with({ origin: 'written' }, (written) => written)
    .with({ origin: 'recognized' }, (recognized) => notedCapture(recognized, note))
    .with({ origin: 'lifted' }, (lifted) => notedCapture(lifted, note))
    .exhaustive();
}

function resolved(
  conflict: CaptureConflict,
  choice: ConflictChoice,
  now: () => number,
): CaptureOutcome {
  const { tagIds } = conflict;
  return match(choice)
    .returnType<CaptureOutcome>()
    .with({ kind: 'device' }, () =>
      tagIds.length === conflict.device.tagIds.length
        ? { kind: 'kept' }
        : { kind: 'kept-merging-tags', capture: { ...conflict.device, tagIds } },
    )
    .with({ kind: 'file' }, () => ({ kind: 'updated', capture: { ...conflict.file, tagIds } }))
    .with({ kind: 'edit' }, ({ text, note }) => {
      const edited = editedCapture({ ...conflict.device, tagIds }, text, now());
      return { kind: 'updated', capture: withNote(edited, note) };
    })
    .exhaustive();
}

function outcomeOf(
  planned: PlannedCapture,
  resolution: ConflictResolution,
  now: () => number,
): CaptureOutcome {
  return match(planned)
    .returnType<CaptureOutcome>()
    .with({ kind: 'new' }, ({ capture, onShelf }) => ({ kind: 'added', capture, onShelf }))
    .with({ kind: 'identical' }, () => ({ kind: 'unchanged' }))
    .with({ kind: 'tags-only' }, ({ capture }) => ({ kind: 'updated', capture }))
    .with({ kind: 'conflict' }, ({ conflict }) =>
      resolved(conflict, choiceFor(resolution, conflict), now),
    )
    .exhaustive();
}

function writtenCapture(outcome: CaptureOutcome): Capture | null {
  return match(outcome)
    .with(
      { kind: 'added' },
      { kind: 'updated' },
      { kind: 'kept-merging-tags' },
      (written) => written.capture,
    )
    .with({ kind: 'kept' }, { kind: 'unchanged' }, () => null)
    .exhaustive();
}

function countsOf(outcomes: readonly CaptureOutcome[], tagsCreated: number): CapturesImportCounts {
  const counts = { added: 0, updated: 0, kept: 0, held: 0, tagsCreated };
  for (const outcome of outcomes) {
    match(outcome)
      .with({ kind: 'added' }, ({ onShelf }) => {
        counts.added += 1;
        if (!onShelf) counts.held += 1;
      })
      .with({ kind: 'updated' }, () => {
        counts.updated += 1;
      })
      .with({ kind: 'kept-merging-tags' }, { kind: 'kept' }, () => {
        counts.kept += 1;
      })
      .with({ kind: 'unchanged' }, () => undefined)
      .exhaustive();
  }
  return counts;
}

async function applyCapturesImport(
  deps: ApplyCapturesImportDeps,
  plan: CapturesImportPlan,
  resolution: ConflictResolution,
): Promise<ApplyCapturesImportResult> {
  for (const record of plan.records) {
    const added = await addRemovedBook(deps.holding, record);
    if (added.kind !== 'success') return added;
  }

  const created = plan.tags.flatMap((planned) => (planned.kind === 'created' ? [planned.tag] : []));
  for (const tag of created) {
    const restored = await restoreTag(deps.tagging, tag);
    if (restored.kind !== 'success') return restored;
  }

  const outcomes = plan.captures.map((planned) => outcomeOf(planned, resolution, deps.now));
  for (const outcome of outcomes) {
    const capture = writtenCapture(outcome);
    if (capture === null) continue;
    const saved = await restoreCapture(deps.saving, capture);
    if (saved.kind !== 'success') return saved;
  }

  return { kind: 'imported', counts: countsOf(outcomes, created.length) };
}

export { applyCapturesImport };
export type {
  ApplyCapturesImportDeps,
  ApplyCapturesImportResult,
  CapturesImportCounts,
  ConflictChoice,
  ConflictResolution,
};
