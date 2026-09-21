import { describe, expect, it } from 'vitest';
import type {
  LibraryError,
  LibraryRepository,
} from '$lib/domains/library/domain/book/library-repository';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type {
  CaptureError,
  CaptureRepository,
} from '$lib/domains/recognition/domain/capture/capture-repository';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { removeBookAndCaptures } from './remove-book-and-captures';
import type { RemoveBookAndCapturesDeps } from './remove-book-and-captures';

const DISK_GONE: LibraryError = { kind: 'storage-failed', cause: 'the disk went away' };

const CAPTURES_GONE: CaptureError = { kind: 'storage-failed', cause: 'the captures went away' };

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

type Outcomes = {
  readonly clearing?: Result<void, CaptureError>;
  readonly removal?: Result<void, LibraryError>;
};

type World = {
  readonly deps: RemoveBookAndCapturesDeps;
  readonly steps: readonly string[];
  readonly cleared: readonly BookId[];
  readonly removed: readonly BookId[];
  readonly booksWithCaptures: () => readonly BookId[];
};

function world(outcomes: Outcomes = {}): World {
  const steps: string[] = [];
  const cleared: BookId[] = [];
  const removed: BookId[] = [];
  let held: readonly BookId[] = [bookId('book-1'), bookId('book-2')];

  const captures: CaptureRepository = {
    listForBook: () => Promise.resolve(ok<readonly Capture[]>([])),
    listEverything: () => Promise.resolve(ok<readonly Capture[]>([])),
    save: () => Promise.reject(new Error('not used')),
    remove: () => Promise.reject(new Error('not used')),
    clearBook: (book) => {
      steps.push('cleared');
      cleared.push(book);
      const outcome = outcomes.clearing ?? ok(undefined);
      if (outcome.ok) held = held.filter((each) => each !== book);
      return Promise.resolve(outcome);
    },
  };

  const repository: LibraryRepository = {
    list: () => Promise.resolve(ok([])),
    get: (id) => Promise.resolve(notFound(id)),
    add: () => Promise.reject(new Error('not used')),
    remove: (id) => {
      steps.push('removed');
      removed.push(id);
      return Promise.resolve(outcomes.removal ?? ok(undefined));
    },
    update: (id) => Promise.resolve(notFound(id)),
    readSource: (id) => Promise.resolve(notFound(id)),
    readCover: (id) => Promise.resolve(notFound(id)),
    storedBytes: () => Promise.resolve(ok(0)),
  };

  return {
    deps: { clearing: { captures }, removal: { repository } },
    steps,
    cleared,
    removed,
    booksWithCaptures: () => held,
  };
}

describe('removeBookAndCaptures', () => {
  it('clears the captures of the book it removes', async () => {
    const origin = world();

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual(ok(undefined));
    expect(origin.cleared).toEqual(['book-1']);
    expect(origin.removed).toEqual(['book-1']);
  });

  it('clears the captures before it removes the book', async () => {
    const origin = world();

    await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(origin.steps).toEqual(['cleared', 'removed']);
  });

  it('keeps the book when its captures cannot be cleared', async () => {
    const origin = world({ clearing: err(CAPTURES_GONE) });

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual(err(CAPTURES_GONE));
    expect(origin.removed).toEqual([]);
  });

  it('reports a failure to remove the book', async () => {
    const origin = world({ removal: err(DISK_GONE) });

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual(err(DISK_GONE));
    expect(origin.cleared).toEqual(['book-1']);
  });

  it('leaves the captures of another book alone', async () => {
    const origin = world();

    await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(origin.booksWithCaptures()).toEqual(['book-2']);
  });
});
