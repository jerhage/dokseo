import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { notedCapture } from '../../domain/capture/capture';
import type { NotableCapture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type WriteCaptureNoteResult<T extends NotableCapture> =
  | { readonly kind: 'success'; readonly capture: T }
  | StorageUnavailable;

type WriteCaptureNoteDeps = {
  readonly captures: CaptureRepository;
};

async function writeCaptureNote<T extends NotableCapture>(
  deps: WriteCaptureNoteDeps,
  capture: T,
  note: string,
): Promise<WriteCaptureNoteResult<T>> {
  const noted = notedCapture(capture, note);
  const stored = await deps.captures.save(noted);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', capture: noted };
}

export { writeCaptureNote };
export type { WriteCaptureNoteDeps, WriteCaptureNoteResult };
