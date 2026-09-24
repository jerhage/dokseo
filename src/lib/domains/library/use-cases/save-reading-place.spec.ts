import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { saveReadingPlace } from './save-reading-place';

type UpdateCall = { readonly id: BookId; readonly edit: BookEdit };

const NOW = 1758300000000;

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

const stored: Book = {
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
  position: imagePlace(imageIndex(3)),
  lastReadAt: null,
  finishedAt: null,
};

function fakeRepository(outcome: Result<Book, LibraryError>) {
  const updates: UpdateCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(ok([])),
    get: (id) => Promise.resolve(notFound(id)),
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

describe('saveReadingPlace', () => {
  it('stores the place and stamps the time it was read', async () => {
    const fake = fakeRepository(ok(stored));

    await saveReadingPlace(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
      imagePlace(imageIndex(12)),
    );

    expect(fake.updates).toEqual([
      { id: 'book-7', edit: { position: { kind: 'image', index: 12 }, lastReadAt: NOW } },
    ]);
  });

  it('stores a text place unchanged', async () => {
    const fake = fakeRepository(ok(stored));

    await saveReadingPlace(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
      textPlace('epubcfi(/6/14!/4/2/14/1:0)', 0.37),
    );

    expect(fake.updates).toEqual([
      {
        id: 'book-7',
        edit: {
          position: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)', fraction: 0.37 },
          lastReadAt: NOW,
        },
      },
    ]);
  });

  it('returns what the repository returned', async () => {
    const failed = err({ kind: 'storage-failed', cause: 'the disk went away' } as const);
    const fake = fakeRepository(failed);

    const result = await saveReadingPlace(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
      imagePlace(imageIndex(12)),
    );

    expect(result).toEqual(failed);
  });
});
