import { describe, expect, it, vi } from 'vitest';
import { buildContainer } from './container';
import type { LibraryRepository } from './domains/library/domain/book/library-repository';
import type { CaptureRepository } from './domains/recognition/domain/capture/capture-repository';
import { bookId } from './shared/ids';
import type { BookId } from './shared/ids';

const GONE = vi.hoisted(() => ({
  id: 'gone-1' as BookId,
  title: 'Gone',
  alias: null,
  contentHash: '0123456789abcdef0123456789abcdef',
  fileName: 'gone.epub',
  language: 'ja' as const,
  direction: 'rtl' as const,
}));

const held = vi.hoisted(() => ({
  removed: [] as string[],
  cleared: [] as string[],
  forgotten: [] as string[],
}));

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

vi.mock('./domains/library/adapters/indexeddb-opfs-library.repo', () => ({
  createLibraryRepository: (): LibraryRepository => ({
    list: () => Promise.resolve({ kind: 'success', books: [], unreadable: [] }),
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

  it('lists the removed books without reading a capture', async () => {
    const result = await buildContainer().library.listRemovedBooks();

    expect(result).toEqual({ kind: 'success', books: [GONE] });
  });
});
