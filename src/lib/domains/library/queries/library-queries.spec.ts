import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { QueryFailure } from '$lib/shared/query-failure';
import { imagePlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { Book } from '../domain/book/book';
import { libraryKeys } from './library-keys';
import {
  booksQuery,
  coversQuery,
  editBookMutation,
  librarySizeQuery,
  markBookMutation,
  openFileMutation,
  removeBookMutation,
} from './library-queries';

const DENIED = { kind: 'storage-failed', cause: 'denied' } as const;

function book(id: string, addedAt: number): Book {
  return {
    id: bookId(id),
    title: id,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 182,
    addedAt,
    position: imagePlace(imageIndex(13)),
    lastReadAt: null,
    finishedAt: null,
  };
}

describe('booksQuery', () => {
  it('orders the newest upload first', async () => {
    const client = createTestQueryClient();

    const books = await client.fetchQuery(
      booksQuery({ listBooks: () => Promise.resolve(ok([book('old', 1), book('new', 2)])) }),
    );

    expect(books.map((held) => held.id)).toEqual(['new', 'old']);
  });

  it('rejects a failed listing with the described message', async () => {
    const client = createTestQueryClient();

    const fetched = client.fetchQuery(
      booksQuery({ listBooks: () => Promise.resolve(err(DENIED)) }),
    );

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow('Local storage failed: denied');
  });
});

describe('coversQuery', () => {
  it('maps each book to its cover and leaves out a book with no cover', async () => {
    const client = createTestQueryClient();
    const cover = new Blob(['cover']);
    const readCover = (id: BookId) => Promise.resolve(ok(id === 'one' ? cover : null));

    const covers = await client.fetchQuery(
      coversQuery({ readCover }, [bookId('one'), bookId('two')]),
    );

    expect(covers).toEqual(new Map([[bookId('one'), cover]]));
  });

  it('resolves no cover for a blocked store or a book the store no longer holds', async () => {
    const client = createTestQueryClient();
    const readCover = (id: BookId) =>
      Promise.resolve(
        id === 'one'
          ? err({ kind: 'storage-unavailable' } as const)
          : err({ kind: 'not-found', id } as const),
      );

    const covers = await client.fetchQuery(
      coversQuery({ readCover }, [bookId('one'), bookId('two')]),
    );

    expect(covers).toEqual(new Map());
  });

  it('rejects a failed cover read, so no empty cover is cached', async () => {
    const client = createTestQueryClient();
    const cover = new Blob(['cover']);
    const readCover = (id: BookId) => Promise.resolve(id === 'one' ? ok(cover) : err(DENIED));
    const options = coversQuery({ readCover }, [bookId('one'), bookId('two')]);

    const fetched = client.fetchQuery(options);

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow('Local storage failed: denied');
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  });
});

describe('librarySizeQuery', () => {
  it('resolves the bytes the uploads occupy', async () => {
    const client = createTestQueryClient();

    const size = await client.fetchQuery(
      librarySizeQuery({ readLibrarySize: () => Promise.resolve(ok(2048)) }),
    );

    expect(size).toBe(2048);
  });

  it('resolves no size when the uploads cannot be measured', async () => {
    const client = createTestQueryClient();

    const size = await client.fetchQuery(
      librarySizeQuery({ readLibrarySize: () => Promise.resolve(err(DENIED)) }),
    );

    expect(size).toBeNull();
  });
});

describe('libraryKeys', () => {
  it('files every library read under the library root key', () => {
    const keys = [
      booksQuery({ listBooks: () => new Promise(() => {}) }).queryKey,
      coversQuery({ readCover: () => new Promise(() => {}) }, [bookId('one')]).queryKey,
      librarySizeQuery({ readLibrarySize: () => new Promise(() => {}) }).queryKey,
    ];

    expect(keys.map((key) => key.slice(0, 1))).toEqual([
      libraryKeys.all(),
      libraryKeys.all(),
      libraryKeys.all(),
    ]);
    expect(new Set(keys.map((key) => key[1])).size).toBe(3);
  });
});

describe('library mutations', () => {
  it('resolves a refused removal as an answer, not a rejection', async () => {
    const client = createTestQueryClient();
    const refused = err(DENIED);
    const removal = new MutationObserver(
      client,
      removeBookMutation({ removeBook: () => Promise.resolve(refused) }),
    );

    await expect(removal.mutate(bookId('one'))).resolves.toBe(refused);
  });

  it('resolves the edit answer, a missing book included', async () => {
    const client = createTestQueryClient();
    const edited = ok(book('one', 1));
    const missing = err({ kind: 'not-found', id: bookId('gone') } as const);
    const editing = new MutationObserver(
      client,
      editBookMutation({ editBook: (id) => Promise.resolve(id === 'gone' ? missing : edited) }),
    );

    await expect(editing.mutate({ id: bookId('one'), edit: { title: 'x' } })).resolves.toBe(edited);
    await expect(editing.mutate({ id: bookId('gone'), edit: { title: 'x' } })).resolves.toBe(
      missing,
    );
  });

  it('rejects a removal that threw', async () => {
    const client = createTestQueryClient();
    const thrown = new Error('broken');
    const removal = new MutationObserver(
      client,
      removeBookMutation({ removeBook: () => Promise.reject(thrown) }),
    );

    await expect(removal.mutate(bookId('one'))).rejects.toBe(thrown);
  });

  it('marks through the write the mark names', async () => {
    const client = createTestQueryClient();
    const finished = ok(book('finished', 1));
    const unread = ok(book('unread', 1));
    const marking = new MutationObserver(
      client,
      markBookMutation({
        markFinished: () => Promise.resolve(finished),
        markUnread: () => Promise.resolve(unread),
      }),
    );

    await expect(marking.mutate({ id: bookId('one'), mark: 'finished' })).resolves.toBe(finished);
    await expect(marking.mutate({ id: bookId('one'), mark: 'unread' })).resolves.toBe(unread);
  });

  it('resolves a refused upload as an answer, not a rejection', async () => {
    const client = createTestQueryClient();
    const refused = err({ kind: 'source', error: { kind: 'empty' } } as const);
    const opening = new MutationObserver(
      client,
      openFileMutation({ openFile: () => Promise.resolve(refused) }),
    );

    await expect(
      opening.mutate({ files: [], matching: 'content', report: () => undefined }),
    ).resolves.toBe(refused);
  });
});
