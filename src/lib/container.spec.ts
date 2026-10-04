import { describe, expect, it, vi } from 'vitest';
import { buildContainer } from './container';
import type { LibraryRepository } from './domains/library/domain/book/library-repository';
import type { CaptureRepository } from './domains/recognition/domain/capture/capture-repository';
import { bookId } from './shared/ids';
import type { BookId, ContentHash } from './shared/ids';

const GONE = vi.hoisted(() => ({
  id: 'gone-1' as BookId,
  title: 'Gone',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja' as const,
  layoutKind: 'flow' as const,
  direction: 'rtl' as const,
  pagePairing: 'auto' as const,
  pageFit: 'width' as const,
  sourceKind: 'epub' as const,
  contentHash: '0123456789abcdef0123456789abcdef' as ContentHash,
  fileName: 'gone.epub',
  imageCount: 0,
  addedAt: 1,
  position: { kind: 'text' as const, cfi: '', fraction: null },
  lastReadAt: null,
  finishedAt: null,
  removedAt: 2,
}));

const held = vi.hoisted(() => ({
  removed: [] as string[],
  cleared: [] as string[],
  forgotten: [] as string[],
  moved: [] as string[],
}));

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

vi.mock('./domains/library/adapters/indexeddb-opfs-library.repo', () => ({
  createLibraryRepository: (): LibraryRepository => ({
    list: () =>
      Promise.resolve({
        kind: 'success',
        books: [],
        unreadable: [
          { id: 'broken-1' as BookId, title: 'Gone', alias: null, contentHash: '', fileName: '' },
        ],
      }),
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: (id: BookId) => {
      held.removed.push(id);
      return Promise.resolve({ kind: 'success' });
    },
    listRemoved: () => Promise.resolve({ kind: 'success', removed: [GONE] }),
    listRestorable: notUsed,
    addRemoved: () => Promise.reject(new Error('not used')),
    forgetRemoved: (id: BookId) => {
      held.forgotten.push(id);
      return Promise.resolve({ kind: 'success' });
    },
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  }),
}));

vi.mock('./domains/recognition/adapters/capture/indexeddb-captures.repo', () => ({
  createCaptureRepository: (): CaptureRepository => ({
    listForBook: notUsed,
    listEverything: notUsed,
    save: notUsed,
    remove: notUsed,
    untagEverywhere: notUsed,
    moveBook: (from: BookId, to: BookId) => {
      held.moved.push(`${from} -> ${to}`);
      return Promise.resolve({ kind: 'success' });
    },
    clearBook: (book: BookId) => {
      held.cleared.push(book);
      return Promise.resolve({ kind: 'success' });
    },
  }),
}));

describe('buildContainer', () => {
  it('removes a book and keeps its captures', async () => {
    const result = await buildContainer().library.removeBook(bookId('book-1'));

    expect(result).toEqual({ kind: 'success' });
    expect(held.removed).toEqual(['book-1']);
    expect(held.cleared).toEqual([]);
    expect(held.forgotten).toEqual([]);
  });

  it('removes a book, deletes its captures by book id and forgets its record when asked to', async () => {
    const result = await buildContainer().library.removeBookAndCaptures(bookId('book-2'));

    expect(result).toEqual({ kind: 'success' });
    expect(held.removed).toContain('book-2');
    expect(held.cleared).toEqual(['book-2']);
    expect(held.forgotten).toEqual(['book-2']);
  });

  it('merges an unreadable book by moving its captures onto the shelf book, then removing it and its record', async () => {
    const result = await buildContainer().library.mergeIntoBook(bookId('held-1'), [
      bookId('broken-1'),
    ]);

    expect(result).toEqual({ kind: 'merged' });
    expect(held.moved).toEqual(['broken-1 -> held-1']);
    expect(held.removed).toContain('broken-1');
    expect(held.forgotten).toContain('broken-1');
  });

  it('lists a shelf holding an unreadable book without reading a capture', async () => {
    const result = await buildContainer().library.listBooks();

    expect(result).toMatchObject({ kind: 'success', unreadable: [{ id: 'broken-1' }] });
  });

  it('lists the removed books without reading a capture', async () => {
    const result = await buildContainer().library.listRemovedBooks();

    expect(result).toEqual({ kind: 'success', books: [GONE] });
  });
});
