import { DEFAULT_PAGE_PAIRING } from '$lib/domains/library/domain/book/book';
import type { Book } from '$lib/domains/library/domain/book/book';
import { bookFromStored } from '$lib/domains/library/domain/book/stored-book';
import { CorruptRow, isStoredFields } from '$lib/shared/corrupt-row';
import { bookId, imageIndex } from '$lib/shared/ids';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import { unreadableData } from './unreadable-data';
import type { UnreadableData } from './unreadable-data';

type SyncedBook = Omit<
  Book,
  'id' | 'pagePairing' | 'pageFit' | 'addedAt' | 'position' | 'lastReadAt' | 'finishedAt'
>;

type BookData = SyncedBook;

type BookFromSyncData = { readonly kind: 'success'; readonly book: SyncedBook } | UnreadableData;

const UNPLACED_BOOK = bookId('unplaced');

function toSyncBookData(book: Book): BookData {
  return {
    contentHash: book.contentHash,
    fileName: book.fileName,
    title: book.title,
    alias: book.alias,
    seriesId: book.seriesId,
    volume: book.volume,
    language: book.language,
    direction: book.direction,
    layoutKind: book.layoutKind,
    sourceKind: book.sourceKind,
    imageCount: book.imageCount,
  };
}

function fromSyncBookData(data: unknown): BookFromSyncData {
  try {
    if (!isStoredFields(data)) throw new CorruptRow('book', 'data', data);
    const row = bookFromStored({
      ...data,
      id: UNPLACED_BOOK,
      seriesId: data['seriesId'] ?? null,
      volume: data['volume'] ?? null,
      pagePairing: DEFAULT_PAGE_PAIRING,
      pageFit: 'width',
      addedAt: 0,
      position: data['layoutKind'] === 'flow' ? START_OF_THE_TEXT : imagePlace(imageIndex(0)),
      lastReadAt: null,
      finishedAt: null,
    });
    const book: SyncedBook = {
      contentHash: row.contentHash,
      fileName: row.fileName,
      title: row.title,
      alias: row.alias,
      seriesId: row.seriesId,
      volume: row.volume,
      language: row.language,
      direction: row.direction,
      layoutKind: row.layoutKind,
      sourceKind: row.sourceKind,
      imageCount: row.imageCount,
    };
    return { kind: 'success', book };
  } catch (cause) {
    return unreadableData(cause);
  }
}

export { fromSyncBookData, toSyncBookData };
export type { BookData, BookFromSyncData, SyncedBook };
