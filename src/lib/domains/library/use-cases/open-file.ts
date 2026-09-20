import { bookId, imageIndex } from '$lib/shared/ids';
import type { LayoutKind } from '$lib/shared/layout-kind';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import type { SourceBuildError, SourceBuilder } from '../domain/ingest/source-builder';
import type { UploadReport } from '../domain/ingest/upload-progress';

type OpenFileError =
  | { readonly kind: 'source'; readonly error: SourceBuildError }
  | { readonly kind: 'storage'; readonly error: LibraryError };

type OpenFileDeps = {
  readonly repository: LibraryRepository;
  readonly builder: SourceBuilder;
  readonly requestPersistence: () => Promise<boolean>;
  readonly now: () => number;
  readonly newId: () => string;
};

async function openFile(
  deps: OpenFileDeps,
  files: readonly File[],
  report: UploadReport = () => undefined,
): Promise<Result<Book, OpenFileError>> {
  await deps.requestPersistence();

  const built = await deps.builder.build(files, report);
  if (!built.ok) return err({ kind: 'source', error: built.error });

  const layoutKind: LayoutKind = 'paged';

  const book: Book = {
    id: bookId(deps.newId()),
    title: built.value.suggestedTitle,
    language: 'ja',
    layoutKind,
    direction: 'rtl',
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: defaultPageFit(layoutKind),
    sourceKind: built.value.sourceKind,
    imageCount: built.value.imageCount,
    addedAt: deps.now(),
    position: imageIndex(0),
  };

  const startedAt = deps.now();
  const stored = await deps.repository.add(
    book,
    built.value.blob,
    built.value.cover,
    (writtenBytes, totalBytes) => {
      report({
        kind: 'storing',
        imageCount: built.value.imageCount,
        writtenBytes,
        totalBytes,
        elapsedMs: deps.now() - startedAt,
      });
    },
  );
  if (!stored.ok) return err({ kind: 'storage', error: stored.error });

  return ok(book);
}

export { openFile };
export type { OpenFileError, OpenFileDeps };
