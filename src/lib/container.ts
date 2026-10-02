import { beginTrace } from '$lib/platform/trace/pipeline-trace';
import type { TraceFactory } from '$lib/platform/trace/pipeline-trace';
import { buildFlowing } from './composition/flowing';
import type { FlowingUseCases } from './composition/flowing';
import { buildLibrary } from './composition/library';
import type { LibraryUseCases } from './composition/library';
import { buildRecognition } from './composition/recognition';
import type { RecognitionUseCases } from './composition/recognition';
import type {
  RecognitionNotices,
  RecognitionProgress,
  RecognitionSessionReport,
} from './composition/recognizers';
import { buildBookRemoval, buildStorage } from './composition/storage';
import type { BookRemoval, StorageUseCases } from './composition/storage';
import { createLibraryRepository } from './domains/library/adapters/indexeddb-opfs-library.repo';
import { createCaptureRepository } from './domains/recognition/adapters/capture/indexeddb-captures.repo';

type Container = {
  readonly beginTrace: TraceFactory;
  readonly library: LibraryUseCases & BookRemoval;
  readonly flowing: FlowingUseCases;
  readonly recognition: RecognitionUseCases;
  readonly storage: StorageUseCases;
};

function buildContainer(): Container {
  const repository = createLibraryRepository();
  const captures = createCaptureRepository();

  return {
    beginTrace,
    library: {
      ...buildLibrary(repository),
      ...buildBookRemoval({ clearing: { captures }, removal: { repository } }),
    },
    flowing: buildFlowing(),
    recognition: buildRecognition(captures),
    storage: buildStorage(),
  };
}

export { buildContainer };
export type { RecognitionProgress, RecognitionSessionReport, RecognitionNotices, Container };
