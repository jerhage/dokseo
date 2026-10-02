import { describe, expect, it, vi } from 'vitest';
import type { LibraryRepository } from './domains/library/domain/book/library-repository';
import type { CaptureRepository } from './domains/recognition/domain/capture/capture-repository';
import { bookId } from './shared/ids';
import type { BookId } from './shared/ids';

const held = vi.hoisted(() => ({
  removed: [] as string[],
  cleared: [] as string[],
}));

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

vi.mock('./domains/library/adapters/indexeddb-opfs-library.repo', () => ({
  createLibraryRepository: (): LibraryRepository => ({
    list: notUsed,
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: (id: BookId) => {
      held.removed.push(id);
      return Promise.resolve({ kind: 'success' });
    },
    listRemoved: notUsed,
    listRestorable: notUsed,
    forgetRemoved: notUsed,
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
    const { buildContainer } = await import('./container');

    const result = await buildContainer().library.removeBook(bookId('book-1'));

    expect(result).toEqual({ kind: 'success' });
    expect(held.removed).toEqual(['book-1']);
    expect(held.cleared).toEqual([]);
  });
});
