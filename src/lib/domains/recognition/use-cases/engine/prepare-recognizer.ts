import type { Result } from '$lib/shared/result';
import type { ModelLoadError } from '../../domain/model/model-load';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { TextRecognizer } from '../../domain/engine/text-recognizer';

type PrepareRecognizerDeps = {
  readonly recognizer: TextRecognizer;
};

function prepareRecognizer(
  deps: PrepareRecognizerDeps,
): Promise<Result<RecognizerSession, ModelLoadError>> {
  return deps.recognizer.prepare();
}

export { prepareRecognizer };
export type { PrepareRecognizerDeps };
