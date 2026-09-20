import type { TextRecognizer } from '../../domain/engine/text-recognizer';

type CloseRecognizerDeps = {
  readonly recognizer: TextRecognizer;
};

function closeRecognizer(deps: CloseRecognizerDeps): void {
  deps.recognizer.cancel();
}

export { closeRecognizer };
export type { CloseRecognizerDeps };
