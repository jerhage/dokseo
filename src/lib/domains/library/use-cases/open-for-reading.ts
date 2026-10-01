import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import { imageLayoutKind } from '$lib/shared/layout-kind';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import type { IntrinsicSourceKind } from '../domain/book/page-list';
import { savePageList } from './save-page-list';

type OpenForReadingDeps = {
  readonly repository: LibraryRepository;
  readonly openPages: (
    sourceKind: IntrinsicSourceKind,
    blob: Blob,
  ) => Promise<Result<PageSource, PageSourceError>>;
  readonly openListedPages: (
    blob: Blob,
    names: readonly string[],
  ) => Promise<Result<PageSource, PageSourceError>>;
  readonly listPageNames: (blob: Blob) => Promise<Result<readonly string[], PageSourceError>>;
};

type OpenedBook =
  | { readonly kind: 'images'; readonly book: Book; readonly pages: PageSource }
  | { readonly kind: 'flow'; readonly book: Book };

type OpenForReadingError =
  | { readonly kind: 'library'; readonly error: LibraryError }
  | { readonly kind: 'source'; readonly error: PageSourceError }
  | { readonly kind: 'source-missing'; readonly id: BookId };

async function pageNamesOf(
  deps: OpenForReadingDeps,
  id: BookId,
  blob: Blob,
): Promise<Result<readonly string[], OpenForReadingError>> {
  const stored = await deps.repository.readPageList(id);
  if (!stored.ok) return err({ kind: 'library', error: stored.error });
  if (stored.value.kind === 'listed') return ok(stored.value.names);

  const listed = await deps.listPageNames(blob);
  if (!listed.ok) return err({ kind: 'source', error: listed.error });
  const saved = await savePageList(deps, id, listed.value);
  if (!saved.ok) return err({ kind: 'library', error: saved.error });
  return ok(listed.value);
}

async function openListed(
  deps: OpenForReadingDeps,
  id: BookId,
  blob: Blob,
): Promise<Result<PageSource, OpenForReadingError>> {
  const names = await pageNamesOf(deps, id, blob);
  if (!names.ok) return names;
  const opened = await deps.openListedPages(blob, names.value);
  if (!opened.ok) return err({ kind: 'source', error: opened.error });
  return opened;
}

async function openIntrinsic(
  deps: OpenForReadingDeps,
  sourceKind: IntrinsicSourceKind,
  blob: Blob,
): Promise<Result<PageSource, OpenForReadingError>> {
  const opened = await deps.openPages(sourceKind, blob);
  if (!opened.ok) return err({ kind: 'source', error: opened.error });
  return opened;
}

async function openForReading(
  deps: OpenForReadingDeps,
  id: BookId,
): Promise<Result<OpenedBook, OpenForReadingError>> {
  const found = await deps.repository.get(id);
  if (!found.ok) return err({ kind: 'library', error: found.error });

  const book = found.value;
  if (imageLayoutKind(book.layoutKind) === null) return ok({ kind: 'flow', book });

  const source = await deps.repository.readSource(id);
  if (!source.ok) return err({ kind: 'library', error: source.error });
  if (source.value === null) return err({ kind: 'source-missing', id });
  const blob = source.value;

  const opened = await match(book.sourceKind)
    .with('pdf', 'epub', (sourceKind) => openIntrinsic(deps, sourceKind, blob))
    .with('images', 'archive', () => openListed(deps, id, blob))
    .exhaustive();
  if (!opened.ok) return opened;

  return ok({ kind: 'images', book, pages: opened.value });
}

export { openForReading };
export type { OpenForReadingDeps, OpenedBook, OpenForReadingError };
