import type { TextRecognizer } from '../../domain/engine/text-recognizer';

export type CloseRecognizerDeps = {
  readonly recognizer: TextRecognizer;
};

export function closeRecognizer(deps: CloseRecognizerDeps): void {
  deps.recognizer.cancel();
}
