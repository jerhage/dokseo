import { describe, expect, it, vi } from 'vitest';
import { bookId, catalogId } from '$lib/shared/ids';
import { readFailed, readReady } from '$lib/shared/read-state';
import { unknownTotal } from '$lib/shared/read-paged-state';
import type { FeedEntry } from '../domain/catalog-feed';
import {
  HOME_ROOT_FEED,
  feedAddress,
  linkEntry,
  publicationEntry,
} from '../domain/catalog-feed-fixtures';
import type { FeedProblem } from '../queries/catalog-feed-queries';
import { publication } from './catalog-ui-fixtures';
import {
  LOADING_FEED,
  coverBlobsOf,
  coverTargetsOf,
  heldOf,
  listingOf,
  lockOf,
  readyFeedOf,
} from './catalog-feed-read';
import type { CatalogFeedRead, FeedState } from './catalog-feed-read';

const LINK = (name: string): FeedEntry =>
  linkEntry({ title: name, address: feedAddress(`https://x.test/${name}`), summary: '' });

const BOOK = (entryId: string): FeedEntry => publicationEntry(publication(entryId));

function readyState(
  more: Extract<FeedState, { kind: 'ready' }>['more'] = { kind: 'end' },
): FeedState {
  return { kind: 'ready', items: [], total: unknownTotal(), refreshing: false, more };
}

const OFFLINE: FeedProblem = { kind: 'offline' };

describe('listingOf', () => {
  it('lists an entry once when a later page repeats it', () => {
    const listing = listingOf([BOOK('a'), BOOK('b'), BOOK('a')]);

    expect(listing.publications.map(({ publication: held }) => held.entryId)).toEqual(['a', 'b']);
  });

  it('lists a link once when a later page repeats it', () => {
    const listing = listingOf([LINK('one'), LINK('two'), LINK('one')]);

    expect(listing.links.map((link) => link.title)).toEqual(['one', 'two']);
  });

  it('numbers the publications across every loaded page', () => {
    const listing = listingOf([BOOK('a'), BOOK('b'), BOOK('a'), BOOK('c')]);

    expect(listing.publications.map(({ feedPosition }) => feedPosition)).toEqual([0, 1, 2]);
  });

  it('keeps links and publications apart', () => {
    const listing = listingOf([LINK('one'), BOOK('a')]);

    expect(listing.links).toHaveLength(1);
    expect(listing.publications).toHaveLength(1);
  });
});

describe('lockOf', () => {
  it('asks for the password when the first page is locked', () => {
    expect(lockOf({ kind: 'failed', failure: { kind: 'locked', id: catalogId('x') } })).toEqual({
      refused: false,
    });
  });

  it('marks the password refused when the first page is unauthorized', () => {
    expect(lockOf({ kind: 'failed', failure: { kind: 'unauthorized' } })).toEqual({
      refused: true,
    });
  });

  it('asks for the password when a later page is unauthorized', () => {
    expect(lockOf(readyState({ kind: 'failed', failure: { kind: 'unauthorized' } }))).toEqual({
      refused: true,
    });
  });

  it('asks for nothing on an ordinary failure, first page or later', () => {
    expect(lockOf({ kind: 'failed', failure: OFFLINE })).toBeNull();
    expect(lockOf(readyState({ kind: 'failed', failure: OFFLINE }))).toBeNull();
  });

  it('asks for nothing while loading or when the feed is ready', () => {
    expect(lockOf({ kind: 'loading' })).toBeNull();
    expect(lockOf(readyState())).toBeNull();
  });
});

describe('readyFeedOf', () => {
  it('answers nothing before the first page and for a failed feed', () => {
    expect(readyFeedOf(LOADING_FEED)).toBeNull();
    expect(
      readyFeedOf({ ...LOADING_FEED, state: { kind: 'failed', failure: OFFLINE } }),
    ).toBeNull();
  });

  it('carries the head, the items and the actions of a ready feed', () => {
    const reload = vi.fn();
    const read: CatalogFeedRead = {
      ...LOADING_FEED,
      state: {
        kind: 'ready',
        items: HOME_ROOT_FEED.items,
        total: unknownTotal(),
        refreshing: false,
        more: { kind: 'end' },
      },
      head: HOME_ROOT_FEED,
      reload,
    };

    const feed = readyFeedOf(read);
    feed?.reload();

    expect(feed?.head).toBe(HOME_ROOT_FEED);
    expect(feed?.items).toBe(HOME_ROOT_FEED.items);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('answers nothing for a ready state without a head', () => {
    expect(readyFeedOf({ ...LOADING_FEED, state: readyState() })).toBeNull();
  });
});

describe('heldOf', () => {
  it('reads the map of a successful read', () => {
    const held = new Map([['a', { bookId: bookId('b'), updated: '2026-01-01T00:00:00Z' }]]);

    expect(heldOf(readReady({ kind: 'success', held }))).toBe(held);
  });

  it('holds nothing while loading, after a failure or when storage is blocked', () => {
    expect(heldOf({ kind: 'loading' }).size).toBe(0);
    expect(heldOf(readFailed('no')).size).toBe(0);
    expect(heldOf(readReady({ kind: 'storage-unavailable' })).size).toBe(0);
  });
});

describe('covers of a listing', () => {
  const PUBLICATIONS = [publication('a'), publication('b', { cover: null }), publication('c')];

  it('targets each cover address once, and skips a publication without a cover', () => {
    const shared = publication('d', { cover: PUBLICATIONS[0]?.cover ?? null });

    expect(coverTargetsOf([...PUBLICATIONS, shared]).map((target) => target.href)).toEqual([
      'https://home.test/cover/a',
      'https://home.test/cover/c',
    ]);
  });

  it('pairs each loaded image with every entry that shows it and skips one that has not loaded', () => {
    const image = new Blob(['x']);
    const shared = publication('d', { cover: PUBLICATIONS[2]?.cover ?? null });
    const all = [...PUBLICATIONS, shared];

    const covers = coverBlobsOf(all, coverTargetsOf(all), [undefined, image]);

    expect([...covers.entries()]).toEqual([
      ['c', image],
      ['d', image],
    ]);
  });
});
