import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { Book } from '../domain/book/book';
import { libraryKeys } from './library-keys';
import {
  bookQuery,
  booksQuery,
  coversQuery,
  editBookMutation,
  librarySizeQuery,
  markBookMutation,
  openFileMutation,
  removeBookMutation,
} from './library-queries';

const BROKEN = new Error('denied');

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

    const listed = await client.fetchQuery(
      booksQuery({
        listBooks: () =>
          Promise.resolve({ kind: 'success', books: [book('old', 1), book('new', 2)] }),
      }),
    );

    expect(listed.kind === 'success' && listed.books.map((held) => held.id)).toEqual([
      'new',
      'old',
    ]);
  });

  it('resolves a blocked store as an answer, so the shelf can name it', async () => {
    const client = createTestQueryClient();

    const listed = await client.fetchQuery(
      booksQuery({ listBooks: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
    );

    expect(listed).toEqual(STORAGE_UNAVAILABLE);
  });

  it('rejects with the error a failed listing throws', async () => {
    const client = createTestQueryClient();

    const fetched = client.fetchQuery(booksQuery({ listBooks: () => Promise.reject(BROKEN) }));

    await expect(fetched).rejects.toBe(BROKEN);
  });
});

describe('bookQuery', () => {
  it('resolves the stored book', async () => {
    const client = createTestQueryClient();
    const stored = book('one', 1);

    const answer = await client.fetchQuery(
      bookQuery(
        { readBook: () => Promise.resolve({ kind: 'success', book: stored }) },
        bookId('one'),
      ),
    );

    expect(answer).toEqual({ kind: 'success', book: stored });
  });

  it('resolves a book the store does not hold as not-found, so the answer is cached', async () => {
    const client = createTestQueryClient();
    const options = bookQuery(
      { readBook: (id) => Promise.resolve({ kind: 'not-found', id }) },
      bookId('gone'),
    );

    const answer = await client.fetchQuery(options);

    expect(answer).toEqual({ kind: 'not-found', id: 'gone' });
    expect(client.getQueryState(options.queryKey)?.status).toBe('success');
  });

  it('rejects with the error a failed read throws', async () => {
    const client = createTestQueryClient();

    const fetched = client.fetchQuery(
      bookQuery({ readBook: () => Promise.reject(BROKEN) }, bookId('one')),
    );

    await expect(fetched).rejects.toBe(BROKEN);
  });

  it('reads nothing while no book is named', async () => {
    const asked: BookId[] = [];
    const client = createTestQueryClient();
    const options = bookQuery(
      {
        readBook: (id) => {
          asked.push(id);
          return Promise.resolve({ kind: 'not-found', id });
        },
      },
      null,
    );

    await expect(client.fetchQuery(options)).rejects.toThrow();
    expect(asked).toEqual([]);
  });
});

describe('coversQuery', () => {
  it('maps each book to its cover and leaves out a book with no cover', async () => {
    const client = createTestQueryClient();
    const cover = new Blob(['cover']);
    const readCover = (id: BookId) =>
      Promise.resolve({ kind: 'success' as const, cover: id === 'one' ? cover : null });

    const covers = await client.fetchQuery(
      coversQuery({ readCover }, [bookId('one'), bookId('two')]),
    );

    expect(covers).toEqual(new Map([[bookId('one'), cover]]));
  });

  it('resolves no cover for a blocked store', async () => {
    const client = createTestQueryClient();
    const readCover = () => Promise.resolve(STORAGE_UNAVAILABLE);

    const covers = await client.fetchQuery(
      coversQuery({ readCover }, [bookId('one'), bookId('two')]),
    );

    expect(covers).toEqual(new Map());
  });

  it('rejects a failed cover read, so no empty cover is cached', async () => {
    const client = createTestQueryClient();
    const cover = new Blob(['cover']);
    const readCover = (id: BookId) =>
      id === 'one' ? Promise.resolve({ kind: 'success' as const, cover }) : Promise.reject(BROKEN);
    const options = coversQuery({ readCover }, [bookId('one'), bookId('two')]);

    const fetched = client.fetchQuery(options);

    await expect(fetched).rejects.toBe(BROKEN);
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  });
});

describe('librarySizeQuery', () => {
  it('resolves the bytes the uploads occupy', async () => {
    const client = createTestQueryClient();

    const size = await client.fetchQuery(
      librarySizeQuery({
        readLibrarySize: () => Promise.resolve({ kind: 'success', bytes: 2048 }),
      }),
    );

    expect(size).toBe(2048);
  });

  it('resolves no size when the browser blocks the store', async () => {
    const client = createTestQueryClient();

    const size = await client.fetchQuery(
      librarySizeQuery({ readLibrarySize: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
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
      bookQuery({ readBook: () => new Promise(() => {}) }, bookId('one')).queryKey,
    ];

    expect(keys.map((key) => key.slice(0, 1))).toEqual([
      libraryKeys.all(),
      libraryKeys.all(),
      libraryKeys.all(),
      libraryKeys.all(),
    ]);
    expect(new Set(keys.map((key) => key[1])).size).toBe(4);
  });
});

describe('library mutations', () => {
  it('resolves a refused removal as an answer, not a rejection', async () => {
    const client = createTestQueryClient();
    const removal = new MutationObserver(
      client,
      removeBookMutation({ removeBook: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
    );

    await expect(removal.mutate(bookId('one'))).resolves.toBe(STORAGE_UNAVAILABLE);
  });

  it('resolves the edit answer, a missing book included', async () => {
    const client = createTestQueryClient();
    const edited = { kind: 'success', book: book('one', 1) } as const;
    const missing = { kind: 'not-found', id: bookId('gone') } as const;
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
    const finished = { kind: 'success', book: book('finished', 1) } as const;
    const unread = { kind: 'success', book: book('unread', 1) } as const;
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
    const refused = { kind: 'source', failure: { kind: 'empty' } } as const;
    const opening = new MutationObserver(
      client,
      openFileMutation({ openFile: () => Promise.resolve(refused) }),
    );

    await expect(
      opening.mutate({ files: [], matching: 'content', report: () => undefined }),
    ).resolves.toBe(refused);
  });
});
