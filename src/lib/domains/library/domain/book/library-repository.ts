import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book, BookEdit } from './book';
import type { PageList, PageOrder } from './page-list';
import type { RemovedBook, RestoreCandidate } from './removed-book';
import type { UnreadableBook } from './stored-book';
import type { SourceWriteReport } from '../ingest/upload-progress';

type LibraryWrite = { readonly kind: 'success' } | StorageUnavailable;

type BookListing =
  | {
      readonly kind: 'success';
      readonly books: readonly Book[];
      readonly unreadable: readonly UnreadableBook[];
    }
  | StorageUnavailable;

type BookLookup = { readonly kind: 'success'; readonly book: Book | null } | StorageUnavailable;

type HeldBookLookup =
  | { readonly kind: 'success'; readonly book: Book | null }
  | { readonly kind: 'unreadable-book'; readonly book: UnreadableBook }
  | StorageUnavailable;

type PageListLookup =
  | { readonly kind: 'success'; readonly pageList: PageList }
  | StorageUnavailable;

type FileLookup = { readonly kind: 'success'; readonly file: Blob | null } | StorageUnavailable;

type RemovedListing =
  | { readonly kind: 'success'; readonly removed: readonly RemovedBook[] }
  | StorageUnavailable;

type RestorableListing =
  | {
      readonly kind: 'success';
      readonly removed: readonly RemovedBook[];
      readonly unreadable: readonly RestoreCandidate[];
    }
  | StorageUnavailable;

type ByteCount = { readonly kind: 'success'; readonly bytes: number } | StorageUnavailable;

interface LibraryRepository {
  list(): Promise<BookListing>;
  get(id: BookId): Promise<HeldBookLookup>;
  add(
    book: Book,
    source: Blob,
    cover: Blob | null,
    order: PageOrder,
    report: SourceWriteReport,
  ): Promise<LibraryWrite>;
  readPageList(id: BookId): Promise<PageListLookup>;
  savePageList(id: BookId, names: readonly string[]): Promise<LibraryWrite>;
  remove(id: BookId, removedAt: number): Promise<LibraryWrite>;
  listRemoved(): Promise<RemovedListing>;
  listRestorable(): Promise<RestorableListing>;
  addRemoved(book: RemovedBook): Promise<LibraryWrite>;
  forgetRemoved(id: BookId): Promise<LibraryWrite>;
  update(id: BookId, edit: BookEdit): Promise<BookLookup>;
  readSource(id: BookId): Promise<FileLookup>;
  readCover(id: BookId): Promise<FileLookup>;
  storedBytes(): Promise<ByteCount>;
}

export type {
  BookListing,
  BookLookup,
  ByteCount,
  FileLookup,
  HeldBookLookup,
  LibraryRepository,
  LibraryWrite,
  PageListLookup,
  RemovedListing,
  RestorableListing,
};
