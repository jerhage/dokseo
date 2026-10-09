import { catalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';
import type { RemotePublication } from '../domain/remote-publication';

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

export { ARCHIVE, HOME, publication };
