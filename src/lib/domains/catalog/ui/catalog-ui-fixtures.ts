import { catalogId } from '$lib/shared/ids';
import { unknownTotal } from '$lib/shared/read-paged-state';
import type { Catalog } from '../domain/catalog';
import type { FeedPage } from '../domain/catalog-feed';
import type { RemotePublication } from '../domain/remote-publication';
import { LOADING_FEED } from './catalog-feed-read';
import type { CatalogFeedRead } from './catalog-feed-read';

const HOME: Catalog = {
  id: catalogId('home'),
  title: 'Home',
  protocol: 'opds1',
  rootUrl: 'https://home.test/opds',
  auth: { kind: 'none' },
};

const ARCHIVE: Catalog = {
  id: catalogId('archive'),
  title: 'Archive',
  protocol: 'opds1',
  rootUrl: 'https://archive.test/opds',
  auth: { kind: 'none' },
};

function publication(
  entryId: string,
  overrides: Partial<RemotePublication> = {},
): RemotePublication {
  return {
    catalogId: HOME.id,
    entryId,
    title: `Book ${entryId}`,
    authors: [],
    language: null,
    summary: '',
    updated: '2026-08-01T00:00:00Z',
    cover: { href: `https://home.test/cover/${entryId}`, mediaType: 'image/png' },
    acquisition: {
      href: `https://home.test/get/${entryId}`,
      format: 'epub',
      mediaType: 'application/epub+zip',
      length: null,
    },
    feedPath: [],
    ...overrides,
  };
}

function readyRead(page: FeedPage, overrides: Partial<CatalogFeedRead> = {}): CatalogFeedRead {
  return {
    ...LOADING_FEED,
    state: {
      kind: 'ready',
      items: page.items,
      total: unknownTotal(),
      refreshing: false,
      more: { kind: 'end' },
    },
    head: page,
    ...overrides,
  };
}

export { ARCHIVE, HOME, publication, readyRead };
