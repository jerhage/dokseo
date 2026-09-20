import type { Result } from '$lib/shared/result';
import type { PartialReport } from '../../domain/model/model-partial';
import type { PartialDownloads, PartialError } from '../../domain/model/partial-downloads';
import type { TextRecognizer } from '../../domain/engine/text-recognizer';

export type CancelModelLoadDeps = {
  readonly recognizer: TextRecognizer;
  readonly partials: PartialDownloads;
};

export async function cancelModelLoad(
  deps: CancelModelLoadDeps,
  modelId: string,
): Promise<Result<PartialReport, PartialError>> {
  deps.recognizer.cancel();
  return await deps.partials.discard(modelId);
}
