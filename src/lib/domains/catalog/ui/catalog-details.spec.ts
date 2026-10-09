import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import { HOME_SERIES_FEED, feedAddress, placed } from '../domain/catalog-feed-fixtures';
import type { BookOriginLink } from '../domain/remote-item';
import type { RemotePublication } from '../domain/remote-publication';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import type { DownloadPublicationResult } from '../use-cases/download-publication';
import { CatalogBrowseView } from './catalog-browse.svelte';
import { CatalogCovers } from './catalog-covers.svelte';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { CatalogSession } from './catalog-session.svelte';
import { HOME } from './catalog-ui-fixtures';
import { publicationFacts, summaryLines } from './publication-facts';

const ROOT_URL = 'https://home.test/opds';
const FIRST = 'urn:uuid:11111111-2222-3333-4444-555555555555';
const SECOND = 'urn:uuid:66666666-7777-8888-9999-000000000000';

function setup(held = new Map<string, BookOriginLink>()) {
  const downloaded: string[] = [];
  const answer = (url: string | null): BrowseCatalogResult => ({
    kind: 'success',
    reading: placed(HOME_SERIES_FEED, feedAddress(url ?? ROOT_URL), []),
    held,
  });
  const downloads = new CatalogDownloads(
    {
      downloadPublication: (publication: RemotePublication) => {
        downloaded.push(publication.entryId);
        return new Promise<DownloadPublicationResult>(() => undefined);
      },
      updatePublication: () => Promise.resolve({ kind: 'aborted' }),
    },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    { describeOpenFile: () => '', downloaded: () => undefined, updated: () => undefined },
  );
  const covers = new CatalogCovers(
    () => Promise.resolve({ kind: 'success', image: new Blob(['x']) }),
    { create: () => 'blob:cover', revoke: () => undefined },
  );
  const view = new CatalogBrowseView(
    HOME,
    {
      browseCatalog: (_id, address) => Promise.resolve(answer(address?.handle ?? null)),
      searchCatalog: () => Promise.resolve(answer(null)),
      unlockCatalog: () => ({ kind: 'success' }),
    },
    new CatalogSession(),
    downloads,
    covers,
  );
  return { view, downloads, downloaded };
}

describe('CatalogBrowseView details', () => {
  it('shows no details until a publication is opened', async () => {
    const { view } = setup();
    await view.start();
    expect(view.opened).toBeNull();
  });

  it('opens the details of the publication chosen by entry id', async () => {
    const { view } = setup();
    await view.start();
    view.openDetails(SECOND);
    expect(view.opened?.publication.title).toBe('Star Voyage 3');
    expect(view.opened?.item.kind).toBe('remote');
  });

  it('closes the details', async () => {
    const { view } = setup();
    await view.start();
    view.openDetails(FIRST);
    view.closeDetails();
    expect(view.opened).toBeNull();
  });

  it('returns focus to the card that opened the details once they close', async () => {
    const { view } = setup();
    await view.start();
    const calls: (FocusOptions | undefined)[] = [];
    const target = {
      isConnected: true,
      focus: (options?: FocusOptions) => void calls.push(options),
    };
    view.openDetails(FIRST, { target, pointer: false });
    view.closeDetails();
    view.closeDetails();
    expect(calls).toEqual([undefined]);
  });

  it('closes the details when another feed opens', async () => {
    const { view } = setup();
    await view.start();
    view.openDetails(FIRST);
    await view.openLink({
      title: 'Other',
      address: feedAddress('https://home.test/opds/other'),
      summary: '',
    });
    expect(view.opened).toBeNull();
  });

  it('shows nothing for an entry id the feed does not list', async () => {
    const { view } = setup();
    await view.start();
    view.openDetails('urn:uuid:missing');
    expect(view.opened).toBeNull();
  });

  it('carries the facts of the opened publication', async () => {
    const { view } = setup();
    await view.start();
    view.openDetails(FIRST);
    const publication = view.opened?.publication;
    expect(publication).toBeDefined();
    if (publication === undefined) return;
    expect(view.opened?.facts).toEqual(publicationFacts(publication));
  });

  it('carries the summary of the opened publication as lines', async () => {
    const { view } = setup();
    await view.start();
    view.openDetails(FIRST);
    const publication = view.opened?.publication;
    expect(publication).toBeDefined();
    if (publication === undefined) return;
    expect(view.opened?.summary).toEqual(summaryLines(publication.summary));
  });

  it('carries the cover url the card uses', async () => {
    const { view } = setup();
    await view.start();
    await Promise.resolve();
    view.openDetails(FIRST);
    expect(view.opened?.cover).toBe(view.covers.urlOf(FIRST));
  });

  it('reports a held publication as held', async () => {
    const { view } = setup(
      new Map([[FIRST, { bookId: bookId('book-1'), updated: '2026-08-15T12:30:00+00:00' }]]),
    );
    await view.start();
    view.openDetails(FIRST);
    expect(view.opened?.item.kind).toBe('held');
  });

  it('starts the download of the opened publication and shows it running', async () => {
    const { view, downloaded } = setup();
    await view.start();
    view.openDetails(SECOND);
    view.downloadOpened();
    expect(downloaded).toEqual([SECOND]);
    expect(view.opened?.item.kind).toBe('downloading');
  });

  it('starts nothing when no publication is open', async () => {
    const { view, downloaded } = setup();
    await view.start();
    view.downloadOpened();
    view.cancelOpened();
    view.replaceOpened();
    expect(downloaded).toEqual([]);
  });

  it('asks to replace the opened publication when its held copy is older', async () => {
    const { view, downloads } = setup(
      new Map([[FIRST, { bookId: bookId('book-1'), updated: '2026-01-01T00:00:00+00:00' }]]),
    );
    await view.start();
    view.openDetails(FIRST);
    view.replaceOpened();
    expect(downloads.replacement?.publication.entryId).toBe(FIRST);
  });
});
