import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import type { CatalogFeed } from '../domain/catalog-feed';
import { feedAddress } from '../domain/catalog-feed-fixtures';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { CatalogBrowseView } from './catalog-browse.svelte';
import { CatalogCovers } from './catalog-covers.svelte';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { CatalogSession } from './catalog-session.svelte';
import { HOME, publication as publicationOf } from './catalog-ui-fixtures';
import { ROOT_POSITION } from './feed-address';

const PAGE_SIZE = 3;
const PAGE_COUNT = 3;
const ROOT_URL = 'https://home.test/opds';

function pageUrl(page: number): string | null {
  return page === 0 ? null : `${ROOT_URL}?page=${page}`;
}

function pagingOf(page: number) {
  const next = page + 1 < PAGE_COUNT ? pageUrl(page + 1) : null;
  return { next: next === null ? null : feedAddress(next) };
}

function entryIds(page: number): string[] {
  return Array.from({ length: PAGE_SIZE }, (_, index) => `p${page}-${index}`);
}

function acquisitionPage(page: number): CatalogFeed {
  const publications = entryIds(page).map((id) => publicationOf(id));
  const feed = {
    id: 'books',
    title: 'Books',
    address: feedAddress(pageUrl(page) ?? ROOT_URL),
    paging: pagingOf(page),
    search: null,
    publications,
  };
  return { kind: 'acquisition', feed };
}

function navigationPage(page: number): CatalogFeed {
  const links = entryIds(page).map((id) => ({
    title: `Author ${id}`,
    address: feedAddress(`https://home.test/opds/author/${id}`),
    summary: '',
  }));
  const feed = {
    id: 'authors',
    title: 'Authors',
    address: feedAddress(pageUrl(page) ?? ROOT_URL),
    paging: pagingOf(page),
    search: null,
    links,
  };
  return { kind: 'navigation', feed };
}

function pageOf(url: string | null): number {
  return url === null ? 0 : Number(new URL(url).searchParams.get('page'));
}

function answering(feedOf: (page: number) => CatalogFeed) {
  return (url: string | null): BrowseCatalogResult => ({
    kind: 'success',
    reading: feedOf(pageOf(url)),
    held: new Map(),
  });
}

type Answer = (url: string | null) => Promise<BrowseCatalogResult>;

function setup(answer: Answer, session = new CatalogSession()) {
  const calls: (string | null)[] = [];
  const downloads = new CatalogDownloads(
    {
      downloadPublication: () => Promise.resolve({ kind: 'aborted' }),
      updatePublication: () => Promise.resolve({ kind: 'aborted' }),
    },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    { describeOpenFile: () => '', downloaded: () => undefined, updated: () => undefined },
  );
  const covers = new CatalogCovers(
    () => Promise.resolve({ kind: 'success', image: new Blob(['x']) }),
    { create: () => 'blob:1', revoke: () => undefined },
  );
  const view = new CatalogBrowseView(
    HOME,
    {
      browseCatalog: (_id, address) => {
        const url = address?.handle ?? null;
        calls.push(url);
        return answer(url);
      },
      searchCatalog: () => Promise.resolve({ kind: 'aborted' }),
      unlockCatalog: () => ({ kind: 'success' }),
    },
    session,
    downloads,
    covers,
  );
  return { view, calls, session };
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function ids(view: CatalogBrowseView): string[] {
  return view.entries.map(({ publication }) => publication.entryId);
}

describe('CatalogBrowseView endless paging', () => {
  const acquisition = answering(acquisitionPage);

  it('appends the next page after the pages already loaded', async () => {
    const { view } = setup((url) => Promise.resolve(acquisition(url)));
    await view.start();
    await view.loadMore();
    expect(ids(view)).toEqual(['p0-0', 'p0-1', 'p0-2', 'p1-0', 'p1-1', 'p1-2']);
  });

  it('numbers the feed positions across every loaded page', async () => {
    const { view } = setup((url) => Promise.resolve(acquisition(url)));
    await view.start();
    await view.loadMore();
    expect(view.entries.map(({ feedPosition }) => feedPosition)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('follows the next link of the last loaded page and stops at the end', async () => {
    const { view, calls } = setup((url) => Promise.resolve(acquisition(url)));
    await view.start();
    await view.loadMore();
    await view.loadMore();
    expect(view.paging.next).toBeNull();
    await view.loadMore();
    expect(calls).toEqual([null, pageUrl(1), pageUrl(2)]);
    expect(view.entries).toHaveLength(PAGE_SIZE * PAGE_COUNT);
  });

  it('runs one load at a time', async () => {
    const waiting: ((answer: BrowseCatalogResult) => void)[] = [];
    const { view, calls } = setup((url) => {
      if (url === null) return Promise.resolve(acquisition(url));
      return new Promise((resolve) => waiting.push(resolve));
    });
    await view.start();
    const first = view.loadMore();
    const second = view.loadMore();
    expect(view.more.kind).toBe('loading');
    waiting[0]?.(acquisition(pageUrl(1)));
    await first;
    await second;
    expect(calls).toEqual([null, pageUrl(1)]);
    expect(view.entries).toHaveLength(PAGE_SIZE * 2);
    expect(view.more.kind).toBe('idle');
  });

  it('keeps the loaded pages when a page fails and appends it on retry', async () => {
    let up = false;
    const { view } = setup((url) =>
      url !== null && !up
        ? Promise.resolve({ kind: 'offline' })
        : Promise.resolve(acquisition(url)),
    );
    await view.start();
    await view.loadMore();
    expect(view.more).toEqual({ kind: 'failed', failure: { kind: 'offline' } });
    expect(view.entries).toHaveLength(PAGE_SIZE);
    up = true;
    await view.loadMore();
    expect(view.more.kind).toBe('idle');
    expect(view.entries).toHaveLength(PAGE_SIZE * 2);
  });

  it('asks for the password when a later page is refused', async () => {
    const { view } = setup((url) =>
      url === null ? Promise.resolve(acquisition(url)) : Promise.resolve({ kind: 'unauthorized' }),
    );
    await view.start();
    await view.loadMore();
    expect(view.state).toEqual({ kind: 'unlock', refused: true });
    expect(view.prompting).toBe(true);
  });

  it('reads the covers of an appended page', async () => {
    const { view } = setup((url) => Promise.resolve(acquisition(url)));
    await view.start();
    await settle();
    await view.loadMore();
    await settle();
    expect(view.covers.urlOf('p0-0')).toBe('blob:1');
    expect(view.covers.urlOf('p1-2')).toBe('blob:1');
  });

  it('drops the appended pages when another feed opens', async () => {
    const { view, session } = setup((url) => Promise.resolve(acquisition(url)));
    await view.start();
    await view.loadMore();
    await view.goToDepth(0);
    expect(view.entries).toHaveLength(PAGE_SIZE);
    expect(session.pagesOf(HOME.id)).toEqual([]);
  });

  it('records each appended page in the session', async () => {
    const { view, session } = setup((url) => Promise.resolve(acquisition(url)));
    await view.start();
    await view.loadMore();
    await view.loadMore();
    expect(session.pagesOf(HOME.id)).toEqual([
      feedAddress(pageUrl(1) ?? ''),
      feedAddress(pageUrl(2) ?? ''),
    ]);
  });

  it('restores every loaded page from the session', async () => {
    const first = setup((url) => Promise.resolve(acquisition(url)));
    await first.view.start();
    await first.view.loadMore();
    await first.view.loadMore();
    const resumed = setup((url) => Promise.resolve(acquisition(url)), first.session);
    await resumed.view.start();
    expect(resumed.calls).toEqual([null, pageUrl(1), pageUrl(2)]);
    expect(resumed.view.entries).toHaveLength(PAGE_SIZE * PAGE_COUNT);
    expect(first.session.pagesOf(HOME.id)).toEqual([
      feedAddress(pageUrl(1) ?? ''),
      feedAddress(pageUrl(2) ?? ''),
    ]);
  });

  it('stops restoring at a page that fails and offers it again', async () => {
    const first = setup((url) => Promise.resolve(acquisition(url)));
    await first.view.start();
    await first.view.loadMore();
    await first.view.loadMore();
    const resumed = setup(
      (url) =>
        url === pageUrl(2)
          ? Promise.resolve({ kind: 'offline' })
          : Promise.resolve(acquisition(url)),
      first.session,
    );
    await resumed.view.start();
    expect(resumed.view.entries).toHaveLength(PAGE_SIZE * 2);
    expect(resumed.view.more.kind).toBe('failed');
    expect(resumed.view.paging.next).toEqual(feedAddress(pageUrl(2) ?? ''));
  });

  it('appends the links of a navigation feed', async () => {
    const navigation = answering(navigationPage);
    const { view } = setup((url) => Promise.resolve(navigation(url)));
    await view.start();
    await view.loadMore();
    expect(view.links.map((link) => link.title)).toEqual([
      'Author p0-0',
      'Author p0-1',
      'Author p0-2',
      'Author p1-0',
      'Author p1-1',
      'Author p1-2',
    ]);
    expect(view.paging.next).toEqual(feedAddress(pageUrl(2) ?? ''));
  });

  it('restores the selection with the pages after a return', async () => {
    const first = setup((url) => Promise.resolve(acquisition(url)));
    await first.view.start();
    await first.view.loadMore();
    first.view.selection.toggle('p1-1');
    const resumed = setup((url) => Promise.resolve(acquisition(url)), first.session);
    await resumed.view.start();
    expect(resumed.view.selection.has('p1-1')).toBe(true);
    expect(resumed.view.selection.count).toBe(1);
  });

  it('clears the selection when another feed opens', async () => {
    const { view, session } = setup((url) => Promise.resolve(acquisition(url)));
    await view.start();
    view.selection.toggle('p0-1');
    await view.goToDepth(0);
    expect(view.selection.count).toBe(0);
    expect(session.selectionOf(HOME.id).size).toBe(0);
  });

  it('lists an entry once when a later page repeats it', async () => {
    const repeating = answering(() => acquisitionPage(0));
    const { view } = setup((url) => Promise.resolve(repeating(url)));
    await view.start();
    await view.loadMore();
    expect(ids(view)).toEqual(['p0-0', 'p0-1', 'p0-2']);
  });
});

function scrollerAt(top: number, scrolled: [number, number][], view: () => CatalogBrowseView) {
  return {
    read: () => top,
    scrollTo: (to: number) => scrolled.push([to, view().entries.length]),
  };
}

describe('CatalogBrowseView scroll memory', () => {
  const acquisition = answering(acquisitionPage);
  const answer = (url: string | null) => Promise.resolve(acquisition(url));

  function resumed(top: number) {
    const session = new CatalogSession();
    session.appendPage(HOME.id, feedAddress(pageUrl(1) ?? ''));
    session.appendPage(HOME.id, feedAddress(pageUrl(2) ?? ''));
    session.keepScroll(HOME.id, top);
    const world = setup(answer, session);
    const scrolled: [number, number][] = [];
    world.view.bindScroller(scrollerAt(0, scrolled, () => world.view));
    return { ...world, scrolled };
  }

  it('scrolls to the saved position once every saved page has loaded', async () => {
    const { view, scrolled } = resumed(1200);
    await view.start();
    expect(scrolled).toEqual([[1200, PAGE_SIZE * PAGE_COUNT]]);
  });

  it('does not scroll when no position was saved', async () => {
    const { view, scrolled } = resumed(0);
    await view.start();
    expect(scrolled).toEqual([]);
  });

  it('scrolls once, so a later load starts from where the reader is', async () => {
    const { view, scrolled } = resumed(1200);
    await view.start();
    await view.load();
    expect(scrolled).toHaveLength(1);
  });

  it('scrolls to the saved position after a saved page fails, over the pages that loaded', async () => {
    const session = new CatalogSession();
    session.appendPage(HOME.id, feedAddress(pageUrl(1) ?? ''));
    session.keepScroll(HOME.id, 900);
    const scrolled: [number, number][] = [];
    const { view } = setup(
      (url) =>
        url === pageUrl(1)
          ? Promise.resolve({ kind: 'offline' })
          : Promise.resolve(acquisition(url)),
      session,
    );
    view.bindScroller(scrollerAt(0, scrolled, () => view));
    await view.start();
    expect(scrolled).toEqual([[900, PAGE_SIZE]]);
  });

  it('scrolls nowhere once the scroller is released', async () => {
    const { view, scrolled } = resumed(1200);
    const release = view.bindScroller(scrollerAt(0, scrolled, () => view));
    release();
    await view.start();
    expect(scrolled).toEqual([]);
  });

  it('keeps the scroll position of the scroller on leave', () => {
    const session = new CatalogSession();
    const { view } = setup(answer, session);
    view.bindScroller({ read: () => 640, scrollTo: () => undefined });
    view.leave();
    expect(session.takeScroll(HOME.id)).toBe(640);
    expect(session.takeScroll(HOME.id)).toBe(0);
  });

  it('keeps nothing on leave while no scroller is bound', () => {
    const session = new CatalogSession();
    const { view } = setup(answer, session);
    view.leave();
    expect(session.takeScroll(HOME.id)).toBe(0);
  });

  it('forgets the scroll position when another feed opens', () => {
    const session = new CatalogSession();
    session.keepScroll(HOME.id, 640);
    session.move(HOME.id, ROOT_POSITION);
    expect(session.takeScroll(HOME.id)).toBe(0);
  });
});
