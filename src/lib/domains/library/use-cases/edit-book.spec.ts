import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Book, BookEdit } from '../domain/book/book';
import type { BookLookup, LibraryRepository } from '../domain/book/library-repository';
import { editBook } from './edit-book';

type UpdateCall = { readonly id: BookId; readonly edit: BookEdit };

const stored: Book = {
  id: bookId('book-7'),
  title: 'Blame! 1',
  language: 'ja',
  layoutKind: 'continuous',
  direction: 'ltr',
  pagePairing: 'single',
  pageFit: 'width',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  fileName: 'book.cbz',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(3)),
  lastReadAt: null,
  finishedAt: null,
};

function fakeRepository(outcome: BookLookup) {
  const updates: UpdateCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve({ kind: 'success', books: [] }),
    get: () => Promise.resolve({ kind: 'success', book: null }),
    add: () => Promise.resolve({ kind: 'success' }),
    remove: () => Promise.resolve({ kind: 'success' }),
    update: (id, edit) => {
      updates.push({ id, edit });
      return Promise.resolve(outcome);
    },
    readSource: () => Promise.resolve({ kind: 'success', file: null }),
    readCover: () => Promise.resolve({ kind: 'success', file: null }),
    storedBytes: () => Promise.resolve({ kind: 'success', bytes: 0 }),
    readPageList: () => Promise.resolve({ kind: 'success', pageList: { kind: 'unlisted' } }),
    savePageList: () => Promise.resolve({ kind: 'success' }),
  };
  return { repository, updates };
}

describe('editBook', () => {
  it('passes the id and the edit to the repository and returns the edited book', async () => {
    const repository = fakeRepository({ kind: 'success', book: stored });
    const edit: BookEdit = { title: 'Blame! 1', layoutKind: 'continuous' };
    const result = await editBook({ repository: repository.repository }, bookId('book-7'), edit);
    expect(repository.updates).toEqual([{ id: 'book-7', edit }]);
    expect(result).toEqual({ kind: 'success', book: stored });
  });

  it('answers not-found for a book the repository no longer holds', async () => {
    const repository = fakeRepository({ kind: 'success', book: null });
    const result = await editBook({ repository: repository.repository }, bookId('book-7'), {
      title: 'Gone',
    });
    expect(result).toEqual({ kind: 'not-found', id: 'book-7' });
  });

  it('passes a blocked store through', async () => {
    const repository = fakeRepository(STORAGE_UNAVAILABLE);
    const result = await editBook({ repository: repository.repository }, bookId('book-7'), {
      title: 'Kept',
    });
    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('passes a text place to the repository unchanged', async () => {
    const repository = fakeRepository({ kind: 'success', book: stored });
    const edit: BookEdit = { position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', null) };
    await editBook({ repository: repository.repository }, bookId('book-7'), edit);
    expect(repository.updates).toEqual([
      {
        id: 'book-7',
        edit: { position: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)', fraction: null } },
      },
    ]);
  });
});
