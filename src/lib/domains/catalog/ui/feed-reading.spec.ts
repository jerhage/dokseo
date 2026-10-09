import { describe, expect, it } from 'vitest';
import { HOME_ROOT_FEED, HOME_SEARCH } from '../domain/catalog-feed-fixtures';
import { readingOfCached } from './feed-reading';

describe('readingOfCached', () => {
  it('reports the search of the first cached page', () => {
    const reading = readingOfCached({
      status: 'success',
      data: { pages: [HOME_ROOT_FEED], pageParams: [null] },
    });

    expect(reading).toEqual({ kind: 'ready', search: HOME_SEARCH });
  });

  it('reports a feed without a search as ready with none', () => {
    const reading = readingOfCached({
      status: 'success',
      data: { pages: [{ ...HOME_ROOT_FEED, search: null }], pageParams: [null] },
    });

    expect(reading).toEqual({ kind: 'ready', search: null });
  });

  it('reports a failed first read as failed', () => {
    expect(readingOfCached({ status: 'error', data: undefined })).toEqual({ kind: 'failed' });
  });

  it('reports nothing for a feed still being read or never asked for', () => {
    expect(readingOfCached({ status: 'pending', data: undefined })).toBeUndefined();
    expect(readingOfCached(undefined)).toBeUndefined();
  });
});
