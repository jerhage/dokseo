import { ok, type Result } from '$lib/shared/result';
import { editedCapture, type Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

export type EditCaptureTextDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

export async function editCaptureText(
  deps: EditCaptureTextDeps,
  capture: Capture,
  text: string,
): Promise<Result<Capture, CaptureError>> {
  const edited = editedCapture(capture, text, deps.now());
  const stored = await deps.captures.save(edited);
  if (!stored.ok) return stored;

  return ok(edited);
}
