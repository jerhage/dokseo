import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { editedCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type EditCaptureTextResult =
  | { readonly kind: 'success'; readonly capture: Capture }
  | StorageUnavailable;

type EditCaptureTextDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

async function editCaptureText(
  deps: EditCaptureTextDeps,
  capture: Capture,
  text: string,
): Promise<EditCaptureTextResult> {
  const edited = editedCapture(capture, text, deps.now());
  const stored = await deps.captures.save(edited);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', capture: edited };
}

export { editCaptureText };
export type { EditCaptureTextDeps, EditCaptureTextResult };
