import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { notedCapture } from '../../domain/capture/capture';
import type { RecognizedCapture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type WriteCaptureNoteDeps = {
  readonly captures: CaptureRepository;
};

async function writeCaptureNote(
  deps: WriteCaptureNoteDeps,
  capture: RecognizedCapture,
  note: string,
): Promise<Result<RecognizedCapture, CaptureError>> {
  const noted = notedCapture(capture, note);
  const stored = await deps.captures.save(noted);
  if (!stored.ok) return stored;

  return ok(noted);
}

export { writeCaptureNote };
export type { WriteCaptureNoteDeps };
