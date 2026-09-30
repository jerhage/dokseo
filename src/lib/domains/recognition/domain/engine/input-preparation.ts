import { match } from 'ts-pattern';
import { MAX_MODEL_INPUT_EDGE } from './model-input';
import type { ModelRuntime } from './model-runtime';

type InputPreparation =
  | { readonly kind: 'pillow-grey'; readonly maxEdge: number }
  | { readonly kind: 'colour'; readonly maxEdge: number };

function inputPreparationFor(runtime: ModelRuntime): InputPreparation {
  return match(runtime)
    .with('manga-ocr', (): InputPreparation => ({
      kind: 'pillow-grey',
      maxEdge: MAX_MODEL_INPUT_EDGE,
    }))
    .with('paddle-ocr', (): InputPreparation => ({ kind: 'colour', maxEdge: MAX_MODEL_INPUT_EDGE }))
    .exhaustive();
}

export { inputPreparationFor };
export type { InputPreparation };
