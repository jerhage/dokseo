import type { TextRecognizer } from '../../domain/engine/text-recognizer';
import type { PartialReport } from '../../domain/model/model-partial';
import type { PartialDownloads } from '../../domain/model/partial-downloads';

type CancelModelLoadResult =
  | { readonly kind: 'success'; readonly report: PartialReport }
  | { readonly kind: 'partials-unavailable' };

type CancelModelLoadDeps = {
  readonly recognizer: TextRecognizer;
  readonly partials: PartialDownloads;
};

async function cancelModelLoad(
  deps: CancelModelLoadDeps,
  modelId: string,
): Promise<CancelModelLoadResult> {
  deps.recognizer.cancel();
  const discarded = await deps.partials.discard(modelId);
  return discarded;
}

export { cancelModelLoad };
export type { CancelModelLoadDeps, CancelModelLoadResult };
