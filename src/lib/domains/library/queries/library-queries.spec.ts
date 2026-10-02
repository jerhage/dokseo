import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import { observedRead } from '$lib/shared/testing/observed-read';
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

    const listed = await observedRead(
      client,
      booksQuery({
        listBooks: () =>
          Promise.resolve({ kind: 'success', books: [book('old', 1), book('new', 2)] }),
      }),
    );

    expect(
      listed.kind === 'ready' &&
        listed.value.kind === 'success' &&
        listed.value.books.map((held) => held.id),
    ).toEqual(['new', 'old']);
  });

  it('resolves a blocked store as an answer, so the shelf can name it', async () => {
    const client = createTestQueryClient();

    const listed = await observedRead(
      client,
      booksQuery({ listBooks: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
    );

    expect(listed).toEqual(readReady(STORAGE_UNAVAILABLE));
  });

  it('fails with the cause of a listing that threw', async () => {
    const client = createTestQueryClient();

    const listed = await observedRead(
      client,
      booksQuery({ listBooks: () => Promise.reject(BROKEN) }),
    );

    expect(listed).toEqual(readFailed('Something went wrong: denied'));
  });
});

describe('bookQuery', () => {
  it('readies the stored book', async () => {
    const client = createTestQueryClient();
    const stored = book('one', 1);

    const answer = await observedRead(
      client,
      bookQuery(
        { readBook: () => Promise.resolve({ kind: 'success', book: stored }) },
        bookId('one'),
      ),
    );

    expect(answer).toEqual(readReady({ kind: 'success', book: stored }));
  });

  it('readies a book the store does not hold as not-found, so the answer is cached', async () => {
    const client = createTestQueryClient();
    const options = bookQuery(
      { readBook: (id) => Promise.resolve({ kind: 'not-found', id }) },
      bookId('gone'),
    );

    const answer = await observedRead(client, options);

    expect(answer).toEqual(readReady({ kind: 'not-found', id: 'gone' }));
    expect(client.getQueryState(options.queryKey)?.status).toBe('success');
  });

  it('fails with the cause of a read that threw', async () => {
    const client = createTestQueryClient();

    const answer = await observedRead(
      client,
      bookQuery({ readBook: () => Promise.reject(BROKEN) }, bookId('one')),
    );

    expect(answer).toEqual(readFailed('Something went wrong: denied'));
  });

  it('reads nothing and stays loading while no book is named', async () => {
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

    expect(await observedRead(client, options)).toEqual(LOADING);
    expect(asked).toEqual([]);
  });
});

describe('coversQuery', () => {
  it('maps each book to its cover and leaves out a book with no cover', async () => {
    const client = createTestQueryClient();
    const cover = new Blob(['cover']);
    const readCover = (id: BookId) =>
      Promise.resolve({ kind: 'success' as const, cover: id === 'one' ? cover : null });

    const covers = await observedRead(
      client,
      coversQuery({ readCover }, [bookId('one'), bookId('two')]),
    );

    expect(covers).toEqual(readReady(new Map([[bookId('one'), cover]])));
  });

  it('readies no cover for a blocked store', async () => {
    const client = createTestQueryClient();
    const readCover = () => Promise.resolve(STORAGE_UNAVAILABLE);

    const covers = await observedRead(
      client,
      coversQuery({ readCover }, [bookId('one'), bookId('two')]),
    );

    expect(covers).toEqual(readReady(new Map()));
  });

  it('fails a cover read that threw, so no empty cover is cached', async () => {
    const client = createTestQueryClient();
    const cover = new Blob(['cover']);
    const readCover = (id: BookId) =>
      id === 'one' ? Promise.resolve({ kind: 'success' as const, cover }) : Promise.reject(BROKEN);
    const options = coversQuery({ readCover }, [bookId('one'), bookId('two')]);

    const covers = await observedRead(client, options);

    expect(covers).toEqual(readFailed('Something went wrong: denied'));
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  });
});

describe('librarySizeQuery', () => {
  it('readies the bytes the uploads occupy', async () => {
    const client = createTestQueryClient();

    const size = await observedRead(
      client,
      librarySizeQuery({
        readLibrarySize: () => Promise.resolve({ kind: 'success', bytes: 2048 }),
      }),
    );

    expect(size).toEqual(readReady(2048));
  });

  it('readies no size when the browser blocks the store', async () => {
    const client = createTestQueryClient();

    const size = await observedRead(
      client,
      librarySizeQuery({ readLibrarySize: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
    );

    expect(size).toEqual(readReady(null));
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

  it('resolves a refused upload as an answer, passing the files, matching and report on', async () => {
    const client = createTestQueryClient();
    const refused = { kind: 'source', failure: { kind: 'empty' } } as const;
    const files = [new File(['x'], 'one.cbz')];
    const report = () => undefined;
    const received: unknown[][] = [];
    const opening = new MutationObserver(
      client,
      openFileMutation({
        openFile: (...args) => {
          received.push(args);
          return Promise.resolve(refused);
        },
      }),
    );

    await expect(opening.mutate({ files, matching: 'file-name', report })).resolves.toBe(refused);
    expect(received).toEqual([[files, 'file-name', report]]);
  });
});
