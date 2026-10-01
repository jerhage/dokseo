import { mutationOptions, queryOptions, skipToken } from '@tanstack/svelte-query';
import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Capture, CaptureDraft, NotableCapture } from '../domain/capture/capture';
import type { CaptureError } from '../domain/capture/capture-repository';
import { recognitionKeys } from './recognition-keys';
import { storeRead } from './store-read';

type CaptureReads = {
  readonly listEveryCapture: () => Promise<Result<readonly Capture[], CaptureError>>;
};

type BookCaptureReads = {
  readonly listCaptures: (book: BookId) => Promise<Result<readonly Capture[], CaptureError>>;
};

type CaptureWrites = {
  readonly saveCapture: (draft: CaptureDraft) => Promise<Result<Capture, CaptureError>>;
  readonly writeNote: (
    id: CaptureId,
    book: BookId,
    anchor: Anchor,
  ) => Promise<Result<Capture, CaptureError>>;
  readonly editCaptureText: (
    capture: Capture,
    text: string,
  ) => Promise<Result<Capture, CaptureError>>;
  readonly writeCaptureNote: <T extends NotableCapture>(
    capture: T,
    note: string,
  ) => Promise<Result<T, CaptureError>>;
  readonly removeCapture: (capture: CaptureId) => Promise<Result<void, CaptureError>>;
  readonly restoreCapture: (capture: Capture) => Promise<Result<void, CaptureError>>;
  readonly clearCaptures: (book: BookId) => Promise<Result<void, CaptureError>>;
};

type NoteRequest = { readonly id: CaptureId; readonly book: BookId; readonly anchor: Anchor };

type TextEdit = { readonly capture: Capture; readonly text: string };

type NoteEdit = { readonly capture: NotableCapture; readonly note: string };

function everyCaptureQuery(recognition: CaptureReads) {
  return queryOptions({
    queryKey: recognitionKeys.everyCapture(),
    queryFn: async () => {
      const listed = await recognition.listEveryCapture();
      return storeRead(listed);
    },
    staleTime: 0,
  });
}

function capturesQuery(recognition: BookCaptureReads, book: BookId | null) {
  return queryOptions({
    queryKey: recognitionKeys.captures(book),
    queryFn:
      book === null
        ? skipToken
        : async () => {
            const listed = await recognition.listCaptures(book);
            return storeRead(listed);
          },
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
  restoreCaptureMutation,
  saveCaptureMutation,
  writeCaptureNoteMutation,
  writeNoteMutation,
};
export type { BookCaptureReads, CaptureReads, CaptureWrites, NoteEdit, NoteRequest, TextEdit };
