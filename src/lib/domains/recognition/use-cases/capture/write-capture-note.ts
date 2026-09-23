import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { notedCapture } from '../../domain/capture/capture';
import type { NotableCapture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type WriteCaptureNoteDeps = {
  readonly captures: CaptureRepository;
};

async function writeCaptureNote<T extends NotableCapture>(
  deps: WriteCaptureNoteDeps,
  capture: T,
  note: string,
): Promise<Result<T, CaptureError>> {
  const noted = notedCapture(capture, note);
  const stored = await deps.captures.save(noted);
  if (!stored.ok) return stored;

  return ok(noted);
}

export { writeCaptureNote };
export type { WriteCaptureNoteDeps };
