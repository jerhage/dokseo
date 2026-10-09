import { catalogId } from '$lib/shared/ids';
import { unknownTotal } from '$lib/shared/read-paged-state';
import type {
  FeedAddress,
  FeedEntry,
  FeedPage,
  FeedSearch,
  NavigationLink,
  TrailStep,
} from './catalog-feed';
import type { RemotePublication } from './remote-publication';

const HOME_SEARCH: FeedSearch = { handle: 'search:home' };

function feedAddress(url: string): FeedAddress {
  return { handle: url };
}

const HOME_ID = catalogId('home');

function linkEntry(link: NavigationLink): FeedEntry {
  return { kind: 'link', link };
}

function publicationEntry(publication: RemotePublication): FeedEntry {
  return { kind: 'publication', publication };
}

const HOME_ROOT_FEED: FeedPage = {
  kind: 'navigation',
  id: 'urn:calibre:main',
  title: 'Sample Library',
  address: feedAddress('https://home.test/opds'),
  next: null,
  search: HOME_SEARCH,
  total: unknownTotal(),
  items: [
    linkEntry({
      title: 'By Newest',
      address: feedAddress('https://home.test/opds/navcatalog/6f6c64657374?library_id=calibre'),
      summary: 'Books sorted by date added',
    }),
    linkEntry({
      title: 'By Series',
      address: feedAddress('https://home.test/opds/navcatalog/4e736572696573?library_id=calibre'),
      summary: 'Books by series',
    }),
  ],
};

const SERIES_ADDRESS = 'https://home.test/opds/navcatalog/4e736572696573?library_id=calibre';

const HOME_SERIES_FEED: FeedPage = {
  kind: 'acquisition',
  id: 'calibre-series:星の旅',
  title: 'Sample Library: Series: 星の旅',
  address: feedAddress(SERIES_ADDRESS),
  next: feedAddress(`${SERIES_ADDRESS}&offset=30`),
  search: HOME_SEARCH,
  total: unknownTotal(),
  items: [
    publicationEntry({
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
    }),
    publicationEntry({
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
    }),
  ],
};

const SHELF_FICTION_FEED: FeedPage = {
  kind: 'acquisition',
  id: 'https://example.org/opds/fiction',
  title: 'Fiction',
  address: feedAddress('https://example.org/opds'),
  next: null,
  search: null,
  total: unknownTotal(),
  items: [
    publicationEntry({
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
    }),
  ],
};

function withoutSearch(page: FeedPage): FeedPage {
  return { ...page, search: null };
}

function identifiedAs(page: FeedPage, id: string): FeedPage {
  return { ...page, id };
}

function placed(
  page: FeedPage,
  address: FeedAddress,
  path: readonly TrailStep[],
  catalog = HOME_ID,
): FeedPage {
  const items = page.items.map((entry): FeedEntry => {
    if (entry.kind === 'link') return entry;
    return publicationEntry({
      ...entry.publication,
      catalogId: catalog,
      feedPath: path.map((step) => ({ title: step.title, href: step.address?.handle ?? '' })),
    });
  });
  return { ...page, address, items };
}

export {
  HOME_ROOT_FEED,
  HOME_SEARCH,
  HOME_SERIES_FEED,
  SHELF_FICTION_FEED,
  feedAddress,
  identifiedAs,
  linkEntry,
  placed,
  publicationEntry,
  withoutSearch,
};
