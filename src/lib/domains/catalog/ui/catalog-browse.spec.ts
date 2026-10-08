import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import { CALIBRE_ROOT, CALIBRE_SERIES } from '../domain/opds-fixtures';
import { readOpdsFeed } from '../domain/opds-feed';
import type { BookOriginLink } from '../domain/remote-item';
import type { FeedPath } from '../domain/remote-publication';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { CatalogBrowseView } from './catalog-browse.svelte';
import { CatalogCovers } from './catalog-covers.svelte';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { CatalogSession } from './catalog-session.svelte';
import { HOME } from './catalog-ui-fixtures';

const ROOT_URL = 'https://home.test/opds';

function feedAnswer(
  xml: string,
  url: string,
  path: FeedPath,
  held = new Map<string, BookOriginLink>(),
) {
  const reading = readOpdsFeed(xml, url, HOME.id, path);
  if (reading.kind === 'not-a-feed') throw new Error('fixture is not a feed');
  const answer: BrowseCatalogResult = { kind: 'success', reading, held };
  return answer;
}

type Call = { id: CatalogId; url: string | null; path: FeedPath; signal: AbortSignal | undefined };

function setup(answer: (call: Call) => Promise<BrowseCatalogResult>) {
  const calls: Call[] = [];
  const unlocked: string[] = [];
  const revoked: string[] = [];
  const session = new CatalogSession();
  const downloads = new CatalogDownloads(
    { downloadPublication: () => Promise.resolve({ kind: 'aborted' }) },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    { describeOpenFile: () => '', downloaded: () => undefined },
  );
  const covers = new CatalogCovers(
    () => Promise.resolve({ kind: 'success', image: new Blob(['x']) }),
    { create: () => 'blob:1', revoke: (url) => revoked.push(url) },
  );
  const view = new CatalogBrowseView(
    HOME,
    {
      browseCatalog: (id, url, path, signal) => {
        const call = { id, url, path, signal };
        calls.push(call);
        return answer(call);
      },
      unlockCatalog: (_id, password) => {
        unlocked.push(password);
        return { kind: 'success' };
      },
    },
    session,
    downloads,
    covers,
  );
  return { view, calls, unlocked, revoked, session, downloads };
}

function byUrl(call: Call): Promise<BrowseCatalogResult> {
  if (call.url === null) return Promise.resolve(feedAnswer(CALIBRE_ROOT, ROOT_URL, call.path));
  return Promise.resolve(feedAnswer(CALIBRE_SERIES, call.url, call.path));
}

const SERIES_LINK = {
  title: 'By Series',
  href: 'https://home.test/opds/navcatalog/4e736572696573?library_id=calibre',
  summary: '',
};

describe('CatalogBrowseView', () => {
  it('reads the root feed first and lists its links', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    expect(calls[0]).toMatchObject({ url: null, path: [] });
    expect(view.state.kind).toBe('navigation');
  });

  it('reads the feed once however often it starts', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.start();
    expect(calls).toHaveLength(1);
  });

  it('opens a link as a step and shows that feed', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(calls[1]?.url).toBe(SERIES_LINK.href);
    expect(calls[1]?.path).toEqual([{ title: 'By Series', href: SERIES_LINK.href }]);
    expect(view.state.kind).toBe('acquisition');
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
  });

  it('goes back to an earlier feed by its crumb', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(view.followCrumb(view.crumbs[0]?.href ?? '')).toBe(true);
    await Promise.resolve();
    expect(calls.at(-1)).toMatchObject({ url: null, path: [] });
  });

  it('ignores a link that is not a crumb', async () => {
    const { view } = setup(byUrl);
    await view.start();
    expect(view.followCrumb('/somewhere')).toBe(false);
  });

  it('pages with next and previous without changing the path', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    await view.next();
    expect(calls.at(-1)?.url).toContain('offset=30');
    expect(calls.at(-1)?.path).toHaveLength(1);
    await view.previous();
    expect(calls.at(-1)?.url).toContain('offset=0');
  });

  it('does nothing for next on a feed without one', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.next();
    expect(calls).toHaveLength(1);
  });

  it('opens a search result as a feed with a Search step', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.search('star voyage');
    expect(calls.at(-1)?.url).toBe(
      'https://home.test/opds/search/star%20voyage?library_id=calibre',
    );
    expect(view.crumbs.at(-1)?.label).toBe('Search: star voyage');
  });

  it('searches from a feed that lacks a search link by the one the root offered', async () => {
    const withoutSearch = CALIBRE_SERIES.replace(/<link title="Search"[^>]*\/>/u, '');
    const { view, calls } = setup((call) =>
      Promise.resolve(
        call.url === null
          ? feedAnswer(CALIBRE_ROOT, ROOT_URL, call.path)
          : feedAnswer(withoutSearch, call.url, call.path),
      ),
    );
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(view.searchTemplate).not.toBeNull();
    await view.search('moon');
    expect(calls.at(-1)?.url).toContain('/opds/search/moon');
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual([HOME.title, 'Search: moon']);
  });

  it('does not search for an empty query', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.search('   ');
    expect(calls).toHaveLength(1);
  });

  it('records the position in the session', async () => {
    const { view, session } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(session.positionOf(HOME.id).path).toHaveLength(1);
  });

  it('resumes at the position the session holds', async () => {
    const first = setup(byUrl);
    await first.view.start();
    await first.view.openLink(SERIES_LINK);
    const calls: Call[] = [];
    const resumed = new CatalogBrowseView(
      HOME,
      {
        browseCatalog: (id, url, path, signal) => {
          calls.push({ id, url, path, signal });
          return byUrl({ id, url, path, signal });
        },
        unlockCatalog: () => ({ kind: 'success' }),
      },
      first.session,
      first.downloads,
      new CatalogCovers(() => Promise.resolve({ kind: 'not-found' })),
    );
    await resumed.start();
    expect(calls[0]?.url).toBe(SERIES_LINK.href);
    expect(resumed.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
  });

  it('hands the held entries to the downloads', async () => {
    const held = new Map([
      [
        'urn:uuid:11111111-2222-3333-4444-555555555555',
        { bookId: bookId('b'), updated: '2026-08-15T12:30:00+00:00' },
      ],
    ]);
    const { view, downloads } = setup((call) =>
      Promise.resolve(
        call.url === null
          ? feedAnswer(CALIBRE_ROOT, ROOT_URL, call.path)
          : feedAnswer(CALIBRE_SERIES, call.url, call.path, held),
      ),
    );
    await view.start();
    await view.openLink(SERIES_LINK);
    if (view.state.kind !== 'acquisition') throw new Error('expected an acquisition feed');
    const [first] = view.state.feed.publications;
    expect(first && downloads.itemFor(first).kind).toBe('held');
  });

  it('revokes the cover urls when the feed changes', async () => {
    const { view, revoked } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    await Promise.resolve();
    await Promise.resolve();
    await view.goToDepth(0);
    expect(revoked.length).toBeGreaterThan(0);
  });

  it('shows only the latest of two overlapping loads', async () => {
    const waiting: ((answer: BrowseCatalogResult) => void)[] = [];
    const { view } = setup((call) => {
      if (call.url === null) return Promise.resolve(feedAnswer(CALIBRE_ROOT, ROOT_URL, call.path));
      return new Promise((resolve) => waiting.push(resolve));
    });
    await view.start();
    const slow = view.openLink(SERIES_LINK);
    const fast = view.goToDepth(0);
    await fast;
    waiting[0]?.(feedAnswer(CALIBRE_SERIES, SERIES_LINK.href, []));
    await slow;
    expect(view.state.kind).toBe('navigation');
  });
});

describe('CatalogBrowseView failures', () => {
  it('asks for the password when the catalog is locked', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'locked', id: HOME.id }));
    await view.start();
    expect(view.state).toEqual({ kind: 'unlock', refused: false });
    expect(view.prompting).toBe(true);
  });

  it('marks the password refused when the server rejects it', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'unauthorized' }));
    await view.start();
    expect(view.state).toEqual({ kind: 'unlock', refused: true });
  });

  it('unlocks with the typed password and reads the feed again', async () => {
    let locked = true;
    const { view, unlocked, calls } = setup((call) => {
      if (locked) return Promise.resolve({ kind: 'locked', id: HOME.id });
      return byUrl(call);
    });
    await view.start();
    locked = false;
    await view.unlock('secret');
    expect(unlocked).toEqual(['secret']);
    expect(calls).toHaveLength(2);
    expect(view.state.kind).toBe('navigation');
    expect(view.prompting).toBe(false);
  });

  it('opens the prompt again when the unlocked password is refused', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'unauthorized' }));
    await view.start();
    await view.unlock('wrong');
    expect(view.state).toEqual({ kind: 'unlock', refused: true });
    expect(view.prompting).toBe(true);
  });

  it('closes the prompt on dismiss without losing the state', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'locked', id: HOME.id }));
    await view.start();
    view.dismissPrompt();
    expect(view.prompting).toBe(false);
    view.askPassword();
    expect(view.prompting).toBe(true);
  });

  it('keeps the failure for the texts', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'offline' }));
    await view.start();
    expect(view.state).toEqual({ kind: 'failed', failure: { kind: 'offline' } });
  });

  it('retries from the failure with load', async () => {
    let up = false;
    const { view } = setup((call) => (up ? byUrl(call) : Promise.resolve({ kind: 'blocked' })));
    await view.start();
    up = true;
    await view.load();
    expect(view.state.kind).toBe('navigation');
  });
});
