import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import { readOpdsFeed } from '../domain/opds-feed';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { CatalogBrowseView } from './catalog-browse.svelte';
import { CatalogCovers } from './catalog-covers.svelte';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { CatalogSession } from './catalog-session.svelte';
import { HOME } from './catalog-ui-fixtures';

const PAGE_SIZE = 3;
const PAGE_COUNT = 3;
const ROOT_URL = 'https://home.test/opds';

function pageUrl(page: number): string | null {
  return page === 0 ? null : `${ROOT_URL}?page=${page}`;
}

function nextLink(page: number): string {
  return page + 1 < PAGE_COUNT ? `<link rel="next" href="${pageUrl(page + 1)}"/>` : '';
}

function acquisitionPage(page: number): string {
  const entries = Array.from({ length: PAGE_SIZE }, (_, index) => {
    const id = `p${page}-${index}`;
    return `<entry><title>Book ${id}</title><id>${id}</id><updated>2026-08-01T00:00:00Z</updated>
      <link rel="http://opds-spec.org/acquisition" type="application/epub+zip" href="/get/${id}"/>
      <link rel="http://opds-spec.org/image" type="image/png" href="/cover/${id}"/></entry>`;
  }).join('');
  return `<feed xmlns="http://www.w3.org/2005/Atom"><title>Books</title><id>books</id>${nextLink(page)}${entries}</feed>`;
}

function navigationPage(page: number): string {
  const entries = Array.from({ length: PAGE_SIZE }, (_, index) => {
    const id = `p${page}-${index}`;
    return `<entry><title>Author ${id}</title><id>${id}</id>
      <link type="application/atom+xml;profile=opds-catalog" href="/opds/author/${id}"/></entry>`;
  }).join('');
  return `<feed xmlns="http://www.w3.org/2005/Atom"><title>Authors</title><id>authors</id>${nextLink(page)}${entries}</feed>`;
}

function pageOf(url: string | null): number {
  return url === null ? 0 : Number(new URL(url).searchParams.get('page'));
}

function answering(xmlOf: (page: number) => string) {
  return (url: string | null): BrowseCatalogResult => {
    const reading = readOpdsFeed(xmlOf(pageOf(url)), url ?? ROOT_URL, HOME.id, []);
    if (reading.kind === 'not-a-feed') throw new Error('fixture is not a feed');
    return { kind: 'success', reading, held: new Map() };
  };
}

type Answer = (url: string | null) => Promise<BrowseCatalogResult>;

function setup(answer: Answer, session = new CatalogSession()) {
  const calls: (string | null)[] = [];
  const downloads = new CatalogDownloads(
    { downloadPublication: () => Promise.resolve({ kind: 'aborted' }) },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    { describeOpenFile: () => '', downloaded: () => undefined },
  );
  const covers = new CatalogCovers(
    () => Promise.resolve({ kind: 'success', image: new Blob(['x']) }),
    { create: () => 'blob:1', revoke: () => undefined },
  );
  const view = new CatalogBrowseView(
    HOME,
    {
      browseCatalog: (_id, url) => {
        calls.push(url);
        return answer(url);
      },
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
    expect(session.pagesOf(HOME.id)).toEqual([pageUrl(1), pageUrl(2)]);
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
    expect(first.session.pagesOf(HOME.id)).toEqual([pageUrl(1), pageUrl(2)]);
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
    expect(resumed.view.paging.next).toBe(pageUrl(2));
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
    expect(view.paging.next).toBe(pageUrl(2));
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
