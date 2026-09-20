import type { TextRecognizer } from '../../domain/engine/text-recognizer';

type PauseModelLoadDeps = {
  readonly recognizer: TextRecognizer;
};

function pauseModelLoad(deps: PauseModelLoadDeps): void {
  deps.recognizer.cancel();
}

export { pauseModelLoad };
export type { PauseModelLoadDeps };
