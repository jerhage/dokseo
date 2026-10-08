import { catalogId } from '$lib/shared/ids';
import type { AcquisitionFeed, CatalogFeed, FeedSearch, NavigationFeed } from './catalog-feed';
import type { FeedPath, RemotePublication } from './remote-publication';

const HOME_SEARCH: FeedSearch = { handle: 'search:home' };

const NO_PAGING = { next: null, previous: null, first: null, last: null } as const;

const HOME_ID = catalogId('home');

const HOME_ROOT_FEED: CatalogFeed = {
  kind: 'navigation',
  feed: {
    id: 'urn:calibre:main',
    title: 'Sample Library',
    address: 'https://home.test/opds',
    paging: NO_PAGING,
    search: HOME_SEARCH,
    links: [
      {
        title: 'By Newest',
        href: 'https://home.test/opds/navcatalog/6f6c64657374?library_id=calibre',
        summary: 'Books sorted by date added',
      },
      {
        title: 'By Series',
        href: 'https://home.test/opds/navcatalog/4e736572696573?library_id=calibre',
        summary: 'Books by series',
      },
    ],
  },
};

const SERIES_ADDRESS = 'https://home.test/opds/navcatalog/4e736572696573?library_id=calibre';

const HOME_SERIES_FEED: CatalogFeed = {
  kind: 'acquisition',
  feed: {
    id: 'calibre-series:星の旅',
    title: 'Sample Library: Series: 星の旅',
    address: SERIES_ADDRESS,
    paging: {
      next: `${SERIES_ADDRESS}&offset=30`,
      previous: `${SERIES_ADDRESS}&offset=0`,
      first: SERIES_ADDRESS,
      last: `${SERIES_ADDRESS}&offset=60`,
    },
    search: HOME_SEARCH,
    publications: [
      {
        catalogId: HOME_ID,
        entryId: 'urn:uuid:11111111-2222-3333-4444-555555555555',
        title: '星の旅 2',
        authors: ['山田 太郎'],
        language: 'ja',
        summary: 'SERIES: 星の旅 [2]The second voyage begins.',
        updated: '2026-08-15T12:30:00+00:00',
        cover: { href: 'https://home.test/get/cover/720/calibre', mediaType: 'image/jpeg' },
        acquisition: {
          href: 'https://home.test/get/epub/720/calibre',
          format: 'epub',
          mediaType: 'application/epub+zip',
          length: 1071903,
        },
        feedPath: [],
      },
      {
        catalogId: HOME_ID,
        entryId: 'urn:uuid:66666666-7777-8888-9999-000000000000',
        title: 'Star Voyage 3',
        authors: ['Jane Roe'],
        language: 'en',
        summary: 'SERIES: Star Voyage [3]Plain tale.',
        updated: '2026-08-16T08:00:00+00:00',
        cover: { href: 'https://home.test/get/cover/721/calibre', mediaType: 'image/jpeg' },
        acquisition: {
          href: 'https://home.test/get/pdf/721/calibre',
          format: 'pdf',
          mediaType: 'application/pdf',
          length: null,
        },
        feedPath: [],
      },
    ],
  },
};

const SHELF_FICTION_FEED: CatalogFeed = {
  kind: 'acquisition',
  feed: {
    id: 'https://example.org/opds/fiction',
    title: 'Fiction',
    address: 'https://example.org/opds',
    paging: NO_PAGING,
    search: null,
    publications: [
      {
        catalogId: HOME_ID,
        entryId: 'https://example.org/book/42',
        title: 'The Lantern Maker',
        authors: ['Ann Poe'],
        language: null,
        summary: 'A short summary.',
        updated: '2026-07-01T00:00:00Z',
        cover: { href: 'https://example.org/covers/42.png', mediaType: 'image/png' },
        acquisition: {
          href: 'https://example.org/files/42.cbz',
          format: 'cbz',
          mediaType: 'application/vnd.comicbook+zip',
          length: 2048,
        },
        feedPath: [],
      },
    ],
  },
};

type FeedChange = <Feed extends NavigationFeed | AcquisitionFeed>(feed: Feed) => Feed;

function changed(reading: CatalogFeed, change: FeedChange): CatalogFeed {
  if (reading.kind === 'navigation') return { kind: 'navigation', feed: change(reading.feed) };
  return { kind: 'acquisition', feed: change(reading.feed) };
}

function withoutSearch(reading: CatalogFeed): CatalogFeed {
  return changed(reading, (feed) => ({ ...feed, search: null }));
}

function identifiedAs(reading: CatalogFeed, id: string): CatalogFeed {
  return changed(reading, (feed) => ({ ...feed, id }));
}

function placed(
  reading: CatalogFeed,
  address: string,
  path: FeedPath,
  catalog = HOME_ID,
): CatalogFeed {
  if (reading.kind === 'navigation') {
    return { kind: 'navigation', feed: { ...reading.feed, address } };
  }
  const publications: readonly RemotePublication[] = reading.feed.publications.map(
    (publication) => ({ ...publication, catalogId: catalog, feedPath: path }),
  );
  return { kind: 'acquisition', feed: { ...reading.feed, address, publications } };
}

export {
  HOME_ROOT_FEED,
  HOME_SEARCH,
  HOME_SERIES_FEED,
  SHELF_FICTION_FEED,
  identifiedAs,
  placed,
  withoutSearch,
};
