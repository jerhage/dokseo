import { afterEach, describe, expect, it, vi } from 'vitest';
import { itemsOf } from './page';
import type { Page } from './page';
import { PagedFailure } from './paged-failure';
import {
  announcementOf,
  knownTotal,
  pagedReadStateOf,
  showingText,
  unknownTotal,
} from './read-paged-state';
import type {
  MoreState,
  PagedReadState,
  PagedSnapshot,
  PagedTexts,
  Total,
} from './read-paged-state';

type Missing = { readonly kind: 'offline' } | { readonly kind: 'denied' };

const OFFLINE: Missing = { kind: 'offline' };

type Flags = {
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
};

const IDLE: Flags = {
  isFetchNextPageError: false,
  isFetchingNextPage: false,
  isFetching: false,
  hasNextPage: false,
};

function pages(...items: readonly (readonly string[])[]): Page<string, number>[] {
  return items.map((one, position) => ({ items: one, next: position + 1 }));
}

function success(
  loaded: readonly Page<string, number>[],
  flags: Partial<Flags> = {},
): PagedSnapshot<string, number> {
  return { ...IDLE, ...flags, status: 'success', data: { pages: loaded } };
}

function stateOf(
  snapshot: PagedSnapshot<string, number>,
  totalOf?: (loaded: readonly Page<string, number>[]) => Total,
): PagedReadState<string, Missing> {
  return pagedReadStateOf<string, number, Missing>(snapshot, totalOf);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('itemsOf', () => {
  it('joins the items of every page in order', () => {
    expect(itemsOf(pages(['a', 'b'], ['c']))).toEqual(['a', 'b', 'c']);
  });
});

describe('pagedReadStateOf', () => {
  it('reports a pending query as loading', () => {
    expect(stateOf({ ...IDLE, isFetching: true, status: 'pending' })).toEqual({ kind: 'loading' });
  });

  it('reports a first page that threw a PagedFailure as failed with the typed failure', () => {
    const error = new PagedFailure<Missing>(OFFLINE);

    expect(stateOf({ ...IDLE, status: 'error', isLoadingError: true, error })).toEqual({
      kind: 'failed',
      failure: OFFLINE,
    });
  });

  it('reports a first page that threw anything else as an unexpected failure and logs it', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new TypeError('broken');

    expect(stateOf({ ...IDLE, status: 'error', isLoadingError: true, error })).toEqual({
      kind: 'failed',
      failure: { kind: 'unexpected', message: 'Something went wrong: broken' },
    });
    expect(logged).toHaveBeenCalledWith('Unexpected failure (query)', error);
  });

  it('reports loaded pages as ready with every item, more to load and an unknown total', () => {
    expect(stateOf(success(pages(['a', 'b']), { hasNextPage: true }))).toEqual({
      kind: 'ready',
      items: ['a', 'b'],
      total: { kind: 'unknown' },
      refreshing: false,
      more: { kind: 'more' },
    });
  });

  it('reports the end when no page follows', () => {
    const state = stateOf(success(pages(['a'])));

    expect(state.kind === 'ready' && state.more).toEqual({ kind: 'end' });
  });

  it('reports the next page as loading and not as refreshing', () => {
    const state = stateOf(
      success(pages(['a']), { hasNextPage: true, isFetching: true, isFetchingNextPage: true }),
    );

    expect(state).toMatchObject({ refreshing: false, more: { kind: 'loading' } });
  });

  it('keeps the loaded items when the next page throws a PagedFailure', () => {
    const state = stateOf({
      ...IDLE,
      hasNextPage: true,
      isFetchNextPageError: true,
      status: 'error',
      isLoadingError: false,
      error: new PagedFailure<Missing>({ kind: 'denied' }),
      data: { pages: pages(['a', 'b']) },
    });

    expect(state).toMatchObject({
      kind: 'ready',
      items: ['a', 'b'],
      more: { kind: 'failed', failure: { kind: 'denied' } },
    });
  });

  it('reports an unexpected failure on the next page without dropping items', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const state = stateOf({
      ...IDLE,
      hasNextPage: true,
      isFetchNextPageError: true,
      status: 'error',
      isLoadingError: false,
      error: new RangeError('out'),
      data: { pages: pages(['a']) },
    });

    expect(state).toMatchObject({
      items: ['a'],
      more: {
        kind: 'failed',
        failure: { kind: 'unexpected', message: 'Something went wrong: out' },
      },
    });
  });

  it('keeps the items and offers more when a refresh fails', () => {
    const state = stateOf({
      ...IDLE,
      hasNextPage: true,
      status: 'error',
      isLoadingError: false,
      error: new PagedFailure<Missing>(OFFLINE),
      data: { pages: pages(['a']) },
    });

    expect(state).toMatchObject({ items: ['a'], refreshing: false, more: { kind: 'more' } });
  });

  it('reports a refetch of loaded pages as refreshing', () => {
    const state = stateOf(success(pages(['a']), { hasNextPage: true, isFetching: true }));

    expect(state).toMatchObject({ refreshing: true, more: { kind: 'more' } });
  });

  it('reads the total from the loaded pages through the supplied function', () => {
    const state = stateOf(success(pages(['a'], ['b'])), (loaded) => knownTotal(loaded.length * 10));

    expect(state).toMatchObject({ total: { kind: 'known', count: 20 } });
  });
});

describe('showingText', () => {
  it('names the count shown and the total when it is known', () => {
    expect(showingText(4, knownTotal(9))).toBe('Showing 4 of 9');
  });

  it('names only the count shown when the total is unknown', () => {
    expect(showingText(4, unknownTotal())).toBe('Showing 4');
  });
});

describe('announcementOf', () => {
  const texts: PagedTexts<Missing> = {
    showing: showingText,
    failed: (problem) => `Could not load more: ${problem.kind}`,
  };

  function ready(more: MoreState<Missing>, refreshing = false): PagedReadState<string, Missing> {
    return { kind: 'ready', items: ['a', 'b'], total: knownTotal(5), refreshing, more };
  }

  it('says nothing while the first page loads or has failed', () => {
    expect(announcementOf({ kind: 'loading' }, texts)).toBeNull();
    expect(announcementOf({ kind: 'failed', failure: OFFLINE }, texts)).toBeNull();
  });

  it('says how many items show once a page has loaded', () => {
    expect(announcementOf(ready({ kind: 'more' }), texts)).toBe('Showing 2 of 5');
    expect(announcementOf(ready({ kind: 'end' }), texts)).toBe('Showing 2 of 5');
  });

  it('says nothing while the next page loads or the list refreshes', () => {
    expect(announcementOf(ready({ kind: 'loading' }), texts)).toBeNull();
    expect(announcementOf(ready({ kind: 'more' }, true), texts)).toBeNull();
  });

  it('says the failure text when the next page failed', () => {
    expect(announcementOf(ready({ kind: 'failed', failure: OFFLINE }), texts)).toBe(
      'Could not load more: offline',
    );
  });
});
