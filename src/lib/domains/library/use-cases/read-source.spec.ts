import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { FileLookup, LibraryRepository } from '../domain/book/library-repository';
import { readSource } from './read-source';

const ID = bookId('book-7');

const SOURCE = new Blob(['source bytes']);

function holding(source: FileLookup): { repository: LibraryRepository } {
  const repository = { readSource: () => Promise.resolve(source) } as unknown as LibraryRepository;
  return { repository };
}

describe('readSource', () => {
  it('passes the stored source file', async () => {
    expect(await readSource(holding({ kind: 'success', file: SOURCE }), ID)).toEqual({
      kind: 'success',
      source: SOURCE,
    });
  });

  it('reports a record without its source file as source-missing, not as not-found', async () => {
    expect(await readSource(holding({ kind: 'success', file: null }), ID)).toEqual({
      kind: 'source-missing',
      id: ID,
    });
  });

  it('passes a blocked store through', async () => {
    expect(await readSource(holding(STORAGE_UNAVAILABLE), ID)).toEqual(STORAGE_UNAVAILABLE);
  });
});
