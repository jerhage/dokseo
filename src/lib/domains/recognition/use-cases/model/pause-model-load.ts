import type { TextRecognizer } from '../../domain/engine/text-recognizer';

export type PauseModelLoadDeps = {
  readonly recognizer: TextRecognizer;
};

export function pauseModelLoad(deps: PauseModelLoadDeps): void {
  deps.recognizer.cancel();
}
