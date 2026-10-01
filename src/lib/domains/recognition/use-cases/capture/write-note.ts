import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type WriteNoteResult = { readonly kind: 'success'; readonly capture: Capture } | StorageUnavailable;

type WriteNoteDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

async function writeNote(
  deps: WriteNoteDeps,
  id: CaptureId,
  book: BookId,
  anchor: Anchor,
): Promise<WriteNoteResult> {
  const note = takenCapture({ id, bookId: book, anchor, text: '', origin: 'written' }, deps.now());
  const stored = await deps.captures.save(note);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', capture: note };
}

export { writeNote };
export type { WriteNoteDeps, WriteNoteResult };
