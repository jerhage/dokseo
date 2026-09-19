import { bookId, imageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { Book } from '../domain/book';
import type { LibraryError, LibraryRepository } from '../domain/library-repository';
import type { SourceBuildError, SourceBuilder } from '../domain/source-builder';

export type OpenFileError =
  | { readonly kind: 'source'; readonly error: SourceBuildError }
  | { readonly kind: 'storage'; readonly error: LibraryError };

export type OpenFileDeps = {
  readonly repository: LibraryRepository;
  readonly builder: SourceBuilder;
  readonly requestPersistence: () => Promise<boolean>;
  readonly now: () => number;
  readonly newId: () => string;
};

export async function openFile(
  deps: OpenFileDeps,
  files: readonly File[],
): Promise<Result<Book, OpenFileError>> {
  await deps.requestPersistence();

  const built = await deps.builder.build(files);
  if (!built.ok) return err({ kind: 'source', error: built.error });

  const book: Book = {
    id: bookId(deps.newId()),
    title: built.value.suggestedTitle,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    sourceKind: built.value.sourceKind,
    imageCount: built.value.imageCount,
    addedAt: deps.now(),
    position: imageIndex(0),
  };

  const stored = await deps.repository.add(book, built.value.blob, built.value.cover);
  if (!stored.ok) return err({ kind: 'storage', error: stored.error });

  return ok(book);
}
