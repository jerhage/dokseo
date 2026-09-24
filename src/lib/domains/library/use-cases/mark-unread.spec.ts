import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { START_OF_THE_TEXT, imagePlace, textPlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { markUnread } from './mark-unread';

type UpdateCall = { readonly id: BookId; readonly edit: BookEdit };

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

const comic: Book = {
  id: bookId('book-7'),
  title: 'Blame! 1',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(181)),
  lastReadAt: 1758300000000,
  finishedAt: 1758400000000,
};

const novel: Book = {
  ...comic,
  layoutKind: 'flow',
  sourceKind: 'epub',
  imageCount: 0,
  position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', 1),
};

function fakeRepository(found: Result<Book, LibraryError>, outcome = found) {
  const updates: UpdateCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(ok([])),
    get: () => Promise.resolve(found),
    add: () => Promise.resolve(ok(undefined)),
    remove: () => Promise.resolve(ok(undefined)),
    update: (id, edit) => {
      updates.push({ id, edit });
      return Promise.resolve(outcome);
    },
    readSource: (id) => Promise.resolve(notFound(id)),
    readCover: (id) => Promise.resolve(notFound(id)),
    storedBytes: () => Promise.resolve(ok(0)),
  };
  return { repository, updates };
}

describe('markUnread', () => {
  it('clears the mark and returns an image book to its first image', async () => {
    const fake = fakeRepository(ok(comic));

    await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(fake.updates).toEqual([
      { id: 'book-7', edit: { finishedAt: null, position: { kind: 'image', index: 0 } } },
    ]);
  });

  it('returns a text book to the start of the text', async () => {
    const fake = fakeRepository(ok(novel));

    await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(fake.updates).toEqual([
      { id: 'book-7', edit: { finishedAt: null, position: START_OF_THE_TEXT } },
    ]);
  });

  it('changes nothing and reports a book it cannot find', async () => {
    const missing = notFound(bookId('book-7'));
    const fake = fakeRepository(missing);

    const result = await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(result).toEqual(missing);
    expect(fake.updates).toEqual([]);
  });

  it('returns what the update returned', async () => {
    const failed = err({ kind: 'storage-failed', cause: 'the disk went away' } as const);
    const fake = fakeRepository(ok(comic), failed);

    const result = await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(result).toEqual(failed);
  });
});
