import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import { imageLayoutKind } from '$lib/shared/layout-kind';
import type {
  PageNamesRead,
  PageSource,
  PageSourceError,
  PageSourceOpening,
} from '$lib/shared/page-source';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book } from '../domain/book/book';
import type { LibraryRepository } from '../domain/book/library-repository';
import type { IntrinsicSourceKind } from '../domain/book/page-list';
import { savePageList } from './save-page-list';

type OpenForReadingDeps = {
  readonly repository: LibraryRepository;
  readonly openPages: (sourceKind: IntrinsicSourceKind, blob: Blob) => Promise<PageSourceOpening>;
  readonly openListedPages: (blob: Blob, names: readonly string[]) => Promise<PageSourceOpening>;
  readonly listPageNames: (blob: Blob) => Promise<PageNamesRead>;
};

type OpenForReadingResult =
  | { readonly kind: 'images'; readonly book: Book; readonly pages: PageSource }
  | { readonly kind: 'flow'; readonly book: Book }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | { readonly kind: 'unreadable-book'; readonly id: BookId }
  | { readonly kind: 'source-missing'; readonly id: BookId }
  | { readonly kind: 'unreadable'; readonly failure: PageSourceError }
  | StorageUnavailable;

type PagesOpened =
  | { readonly kind: 'success'; readonly pages: PageSource }
  | { readonly kind: 'unreadable'; readonly failure: PageSourceError }
  | StorageUnavailable;

type PageNames =
  | { readonly kind: 'success'; readonly names: readonly string[] }
  | { readonly kind: 'unreadable'; readonly failure: PageSourceError }
  | StorageUnavailable;

function opened(opening: PageSourceOpening): PagesOpened {
  if (opening.kind !== 'success') return { kind: 'unreadable', failure: opening };
  return opening;
}

async function pageNamesOf(deps: OpenForReadingDeps, id: BookId, blob: Blob): Promise<PageNames> {
  const stored = await deps.repository.readPageList(id);
  if (stored.kind !== 'success') return stored;
  return match(stored.pageList)
    .returnType<Promise<PageNames>>()
    .with({ kind: 'listed' }, ({ names }) => Promise.resolve({ kind: 'success', names }))
    .with({ kind: 'unreadable' }, ({ cause }) =>
      Promise.resolve({ kind: 'unreadable', failure: { kind: 'source-unreadable', cause } }),
    )
    .with({ kind: 'unlisted' }, () => listedFromTheSource(deps, id, blob))
    .exhaustive();
}

async function listedFromTheSource(
  deps: OpenForReadingDeps,
  id: BookId,
  blob: Blob,
): Promise<PageNames> {
  const listed = await deps.listPageNames(blob);
  if (listed.kind !== 'success') return { kind: 'unreadable', failure: listed };
  const saved = await savePageList(deps, id, listed.names);
  if (saved.kind !== 'success') return saved;
  return { kind: 'success', names: listed.names };
}

async function openListed(deps: OpenForReadingDeps, id: BookId, blob: Blob): Promise<PagesOpened> {
  const names = await pageNamesOf(deps, id, blob);
  if (names.kind !== 'success') return names;
  const opening = await deps.openListedPages(blob, names.names);
  return opened(opening);
}

async function openIntrinsic(
  deps: OpenForReadingDeps,
  sourceKind: IntrinsicSourceKind,
  blob: Blob,
): Promise<PagesOpened> {
  const opening = await deps.openPages(sourceKind, blob);
  return opened(opening);
}

async function openForReading(deps: OpenForReadingDeps, id: BookId): Promise<OpenForReadingResult> {
  const found = await deps.repository.get(id);
  if (found.kind === 'unreadable-book') return { kind: 'unreadable-book', id };
  if (found.kind !== 'success') return found;
  const book = found.book;
  if (book === null) return { kind: 'not-found', id };

  if (imageLayoutKind(book.layoutKind) === null) return { kind: 'flow', book };

  const source = await deps.repository.readSource(id);
  if (source.kind !== 'success') return source;
  const blob = source.file;
  if (blob === null) return { kind: 'source-missing', id };

  const pages = await match(book.sourceKind)
    .with('pdf', 'epub', (sourceKind) => openIntrinsic(deps, sourceKind, blob))
    .with('images', 'archive', () => openListed(deps, id, blob))
    .exhaustive();
  if (pages.kind !== 'success') return pages;

  return { kind: 'images', book, pages: pages.pages };
}

export { openForReading };
export type { OpenForReadingDeps, OpenForReadingResult };
