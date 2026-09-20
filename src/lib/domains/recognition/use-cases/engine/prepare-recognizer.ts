import type { Result } from '$lib/shared/result';
import type { ModelLoadError } from '../../domain/model/model-load';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { TextRecognizer } from '../../domain/engine/text-recognizer';

export type PrepareRecognizerDeps = {
  readonly recognizer: TextRecognizer;
};

export function prepareRecognizer(
  deps: PrepareRecognizerDeps,
): Promise<Result<RecognizerSession, ModelLoadError>> {
  return deps.recognizer.prepare();
}
