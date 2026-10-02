import { mutationOptions, queryOptions, skipToken } from '@tanstack/svelte-query';
import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Capture, CaptureDraft, NotableCapture } from '../domain/capture/capture';
import type { ClearCapturesResult } from '../use-cases/capture/clear-captures';
import type { EditCaptureTextResult } from '../use-cases/capture/edit-capture-text';
import type { ListCapturesResult } from '../use-cases/capture/list-captures';
import type { ListEveryCaptureResult } from '../use-cases/capture/list-every-capture';
import type { RemoveCaptureResult } from '../use-cases/capture/remove-capture';
import type { RemoveUnreadableCapturesResult } from '../use-cases/capture/remove-unreadable-captures';
import type { RestoreCaptureResult } from '../use-cases/capture/restore-capture';
import type { SaveCaptureResult } from '../use-cases/capture/save-capture';
import type { WriteCaptureNoteResult } from '../use-cases/capture/write-capture-note';
import type { WriteNoteResult } from '../use-cases/capture/write-note';
import { recognitionKeys } from './recognition-keys';

type CaptureReads = {
  readonly listEveryCapture: () => Promise<ListEveryCaptureResult>;
};

type BookCaptureReads = {
  readonly listCaptures: (book: BookId) => Promise<ListCapturesResult>;
};

type CaptureWrites = {
  readonly saveCapture: (draft: CaptureDraft) => Promise<SaveCaptureResult>;
  readonly writeNote: (id: CaptureId, book: BookId, anchor: Anchor) => Promise<WriteNoteResult>;
  readonly editCaptureText: (capture: Capture, text: string) => Promise<EditCaptureTextResult>;
  readonly writeCaptureNote: <T extends NotableCapture>(
    capture: T,
    note: string,
  ) => Promise<WriteCaptureNoteResult<T>>;
  readonly removeCapture: (capture: CaptureId) => Promise<RemoveCaptureResult>;
  readonly restoreCapture: (capture: Capture) => Promise<RestoreCaptureResult>;
  readonly removeUnreadableCaptures: (
    ids: readonly CaptureId[],
  ) => Promise<RemoveUnreadableCapturesResult>;
  readonly clearCaptures: (book: BookId) => Promise<ClearCapturesResult>;
};

type NoteRequest = { readonly id: CaptureId; readonly book: BookId; readonly anchor: Anchor };

type TextEdit = { readonly capture: Capture; readonly text: string };

type NoteEdit = { readonly capture: NotableCapture; readonly note: string };

function everyCaptureQuery(recognition: CaptureReads) {
  return queryOptions({
    queryKey: recognitionKeys.everyCapture(),
    queryFn: () => recognition.listEveryCapture(),
    staleTime: 0,
  });
}

function capturesQuery(recognition: BookCaptureReads, book: BookId | null) {
  return queryOptions({
    queryKey: recognitionKeys.captures(book),
    queryFn: book === null ? skipToken : () => recognition.listCaptures(book),
    staleTime: 0,
  });
}

function saveCaptureMutation(recognition: Pick<CaptureWrites, 'saveCapture'>) {
  return mutationOptions({
    mutationFn: (draft: CaptureDraft) => recognition.saveCapture(draft),
  });
}

function writeNoteMutation(recognition: Pick<CaptureWrites, 'writeNote'>) {
  return mutationOptions({
    mutationFn: ({ id, book, anchor }: NoteRequest) => recognition.writeNote(id, book, anchor),
  });
}

function editTextMutation(recognition: Pick<CaptureWrites, 'editCaptureText'>) {
  return mutationOptions({
    mutationFn: ({ capture, text }: TextEdit) => recognition.editCaptureText(capture, text),
  });
}

function writeCaptureNoteMutation(recognition: Pick<CaptureWrites, 'writeCaptureNote'>) {
  return mutationOptions({
    mutationFn: ({ capture, note }: NoteEdit) => recognition.writeCaptureNote(capture, note),
  });
}

function removeCaptureMutation(recognition: Pick<CaptureWrites, 'removeCapture'>) {
  return mutationOptions({
    mutationFn: (capture: Capture) => recognition.removeCapture(capture.id),
  });
}

function restoreCaptureMutation(recognition: Pick<CaptureWrites, 'restoreCapture'>) {
  return mutationOptions({
    mutationFn: (capture: Capture) => recognition.restoreCapture(capture),
  });
}

function removeUnreadableCapturesMutation(
  recognition: Pick<CaptureWrites, 'removeUnreadableCaptures'>,
) {
  return mutationOptions({
    mutationFn: (ids: readonly CaptureId[]) => recognition.removeUnreadableCaptures(ids),
  });
}

function clearCapturesMutation(recognition: Pick<CaptureWrites, 'clearCaptures'>) {
  return mutationOptions({
    mutationFn: (book: BookId) => recognition.clearCaptures(book),
  });
}

export {
  capturesQuery,
  clearCapturesMutation,
  editTextMutation,
  everyCaptureQuery,
  removeCaptureMutation,
  removeUnreadableCapturesMutation,
  restoreCaptureMutation,
  saveCaptureMutation,
  writeCaptureNoteMutation,
  writeNoteMutation,
};
export type { BookCaptureReads, CaptureReads, CaptureWrites, NoteEdit, NoteRequest, TextEdit };
