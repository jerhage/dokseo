import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { TextRecognizer } from '../../domain/engine/text-recognizer';
import type { ModelLoadError } from '../../domain/model/model-load';

type PrepareRecognizerResult =
  | { readonly kind: 'success'; readonly session: RecognizerSession }
  | ModelLoadError;

type PrepareRecognizerDeps = {
  readonly recognizer: TextRecognizer;
};

function prepareRecognizer(deps: PrepareRecognizerDeps): Promise<PrepareRecognizerResult> {
  return deps.recognizer.prepare();
}

export { prepareRecognizer };
export type { PrepareRecognizerDeps, PrepareRecognizerResult };
