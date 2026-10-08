import { beginTrace } from '$lib/platform/trace/pipeline-trace';
import type { TraceFactory } from '$lib/platform/trace/pipeline-trace';
import { buildCatalog } from './composition/catalog';
import type { CatalogUseCases } from './composition/catalog';
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
import {
  buildBookCapturesExports,
  buildCapturesExports,
  buildCapturesImports,
  buildRemovedBooks,
  buildStorage,
  buildUnreadableRowsExports,
} from './composition/storage';
import type {
  BookCapturesExports,
  CapturesExports,
  CapturesImports,
  RemovedBooks,
  StorageUseCases,
  UnreadableRowsExports,
} from './composition/storage';
import { createLibraryRepository } from './domains/library/adapters/indexeddb-opfs-library.repo';
import { createCaptureRepository } from './domains/recognition/adapters/capture/indexeddb-captures.repo';

type Container = {
  readonly beginTrace: TraceFactory;
  readonly catalog: CatalogUseCases;
  readonly library: LibraryUseCases & RemovedBooks & BookCapturesExports;
  readonly flowing: FlowingUseCases;
  readonly recognition: RecognitionUseCases & BookCapturesExports & UnreadableRowsExports;
  readonly storage: StorageUseCases & CapturesExports & CapturesImports;
};

function buildContainer(): Container {
  const repository = createLibraryRepository();
  const captures = createCaptureRepository();
  const removedBooks = buildRemovedBooks(repository, captures);
  const bookExports = buildBookCapturesExports(repository, captures);
  const library = buildLibrary(repository, removedBooks.mergeIntoBook);

  return {
    beginTrace,
    catalog: buildCatalog(library),
    library: {
      ...library,
      ...removedBooks,
      ...bookExports,
    },
    flowing: buildFlowing(),
    recognition: {
      ...buildRecognition(captures),
      ...bookExports,
      ...buildUnreadableRowsExports(),
    },
    storage: {
      ...buildStorage(),
      ...buildCapturesExports(repository, captures),
      ...buildCapturesImports(repository, captures),
    },
  };
}

export { buildContainer };
export type { RecognitionProgress, RecognitionSessionReport, RecognitionNotices, Container };
