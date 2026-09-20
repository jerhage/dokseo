import type { TextRecognizer } from '../domain/text-recognizer';

export type CancelModelLoadDeps = {
  readonly recognizer: TextRecognizer;
};

export function cancelModelLoad(deps: CancelModelLoadDeps): void {
  deps.recognizer.cancel();
}
