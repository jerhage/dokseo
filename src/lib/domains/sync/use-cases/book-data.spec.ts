import { describe, expect, it } from 'vitest';
import type { BookOrigin } from '$lib/domains/catalog/domain/book-origin';
import type { Book } from '$lib/domains/library/domain/book/book';
import { bookId, catalogId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { fromSyncBookData, toSyncBookData } from './book-data';
import { contractExamples, schemaKeys } from './contract-examples';

const BOOK: Book = {
  id: bookId('device-local-id'),
  title: 'Yotsuba&!',
  alias: 'Neko',
  seriesId: null,
  volume: 1,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'auto',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('0123456789abcdef0123456789abcdef'),
  fileName: 'Yotsuba v01.cbz',
  imageCount: 192,
  addedAt: 1772445000000,
  position: imagePlace(imageIndex(3)),
  lastReadAt: 1772445500000,
  finishedAt: null,
};

const ORIGIN: BookOrigin = {
  bookId: BOOK.id,
  catalogId: catalogId('00000000-0000-4000-8000-000000000009'),
  entryId: 'urn:uuid:5d1c',
  acquisition: {
    href: '/get/5d1c.cbz',
    format: 'cbz',
    mediaType: 'application/vnd.comicbook+zip',
    length: 48210000,
  },
  updated: '2026-03-02T10:00:00Z',
  feedPath: [{ title: 'Library', href: '/opds' }],
  feedPosition: 3,
  downloadedAt: 1772445600000,
};

describe('book record data', () => {
  it('reads every valid contract example as a book', () => {
    for (const { name, value } of contractExamples('valid', 'book')) {
      expect(fromSyncBookData(value).kind, name).toBe('success');
    }
  });

  it('reports every invalid contract example as unreadable', () => {
    for (const { name, value } of contractExamples('invalid', 'book')) {
      expect(fromSyncBookData(value).kind, name).toBe('unreadable');
    }
  });

  it('leaves the device-local fields out of the data', () => {
    const { properties } = schemaKeys('book');
    const keys = Object.keys(toSyncBookData(BOOK, ORIGIN));
    expect(keys.filter((key) => !properties.includes(key))).toEqual([]);
    expect(keys).not.toContain('id');
    expect(keys).not.toContain('position');
  });

  it('reads a book without a catalog origin back unchanged', () => {
    const read = fromSyncBookData(toSyncBookData(BOOK, null));
    if (read.kind !== 'success') throw new Error(read.reason);
    expect(read.origin).toBeNull();
    expect(read.book).toEqual({
      contentHash: BOOK.contentHash,
      fileName: BOOK.fileName,
      title: BOOK.title,
      alias: BOOK.alias,
      seriesId: BOOK.seriesId,
      volume: BOOK.volume,
      language: BOOK.language,
      direction: BOOK.direction,
      layoutKind: BOOK.layoutKind,
      sourceKind: BOOK.sourceKind,
      imageCount: BOOK.imageCount,
    });
  });

  it('reads the catalog origin back without the device book id', () => {
    const read = fromSyncBookData(toSyncBookData(BOOK, ORIGIN));
    if (read.kind !== 'success') throw new Error(read.reason);
    const { bookId: _local, ...synced } = ORIGIN;
    expect(read.origin).toEqual(synced);
  });
  it('reads the acquisition with its format from a written origin', () => {
    const read = fromSyncBookData(toSyncBookData(BOOK, ORIGIN));
    if (read.kind !== 'success') throw new Error(read.reason);
    expect(read.origin?.acquisition).toEqual(ORIGIN.acquisition);
    expect(read.origin?.acquisition.format).toBe(ORIGIN.acquisition.format);
  });

  it('reads the acquisition format from the contract example with an origin', () => {
    const example = contractExamples('valid', 'book').find(({ name }) =>
      name.includes('with-origin'),
    );
    if (example === undefined) throw new Error('no contract example carries an origin');
    const read = fromSyncBookData(example.value);
    if (read.kind !== 'success') throw new Error(read.reason);
    expect(read.origin?.acquisition.format).toBe('cbz');
  });

  it('reports an origin whose acquisition has no format as unreadable', () => {
    const written = toSyncBookData(BOOK, ORIGIN);
    const { format: _format, ...withoutFormat } = ORIGIN.acquisition;
    const read = fromSyncBookData({
      ...written,
      origin: { ...written.origin, acquisition: withoutFormat },
    });
    expect(read.kind).toBe('unreadable');
  });
});
