import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { readSource } from './read-source';

const ID = bookId('book-7');

const SOURCE = new Blob(['source bytes']);

function holding(source: Result<Blob | null, LibraryError>): { repository: LibraryRepository } {
  const repository = { readSource: () => Promise.resolve(source) } as unknown as LibraryRepository;
  return { repository };
}

describe('readSource', () => {
  it('passes the stored source file', async () => {
    expect(await readSource(holding(ok(SOURCE)), ID)).toEqual(ok(SOURCE));
  });

  it('reports a record without its source file as source-missing, not as not-found', async () => {
    expect(await readSource(holding(ok(null)), ID)).toEqual(
      err({ kind: 'source-missing', id: ID }),
    );
  });

  it('passes a storage failure through', async () => {
    const failed = err<LibraryError>({ kind: 'storage-failed', cause: 'locked' });

    expect(await readSource(holding(failed), ID)).toEqual(failed);
  });
});
