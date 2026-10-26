import type { RecordVersions } from '$lib/shared/change-marker';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ReadRecognitionVersionsResult = RecordVersions;

type ReadRecognitionVersionsDeps = { readonly captures: CaptureRepository };

function readRecognitionVersions(
  deps: ReadRecognitionVersionsDeps,
): Promise<ReadRecognitionVersionsResult> {
  return deps.captures.recordVersions();
}

export { readRecognitionVersions };
export type { ReadRecognitionVersionsDeps, ReadRecognitionVersionsResult };
