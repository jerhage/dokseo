import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type WriteNoteDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

async function writeNote(
  deps: WriteNoteDeps,
  id: CaptureId,
  book: BookId,
  anchor: Anchor,
): Promise<Result<Capture, CaptureError>> {
  const note = takenCapture({ id, bookId: book, anchor, text: '', origin: 'written' }, deps.now());
  const stored = await deps.captures.save(note);
  if (!stored.ok) return stored;

  return ok(note);
}

export { writeNote };
export type { WriteNoteDeps };
