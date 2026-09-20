import type { BookId } from '$lib/shared/ids';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok, type Result } from '$lib/shared/result';
import type { Book, SourceKind } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

export type OpenForReadingDeps = {
  readonly repository: LibraryRepository;
  readonly openPages: (
    sourceKind: SourceKind,
    blob: Blob,
  ) => Promise<Result<PageSource, PageSourceError>>;
};

export type OpenedBook = { readonly book: Book; readonly pages: PageSource };

export type OpenForReadingError =
  | { readonly kind: 'library'; readonly error: LibraryError }
  | { readonly kind: 'source'; readonly error: PageSourceError };

export async function openForReading(
  deps: OpenForReadingDeps,
  id: BookId,
): Promise<Result<OpenedBook, OpenForReadingError>> {
  const found = await deps.repository.get(id);
  if (!found.ok) return err({ kind: 'library', error: found.error });

  const source = await deps.repository.readSource(id);
  if (!source.ok) return err({ kind: 'library', error: source.error });

  const opened = await deps.openPages(found.value.sourceKind, source.value);
  if (!opened.ok) return err({ kind: 'source', error: opened.error });

  return ok({ book: found.value, pages: opened.value });
}
