import type { SourceSnippet } from '../ocr/ocr-snippets';

const CONNECT_SOURCES: SourceSnippet = {
  label: 'The connect-src sources',
  file: 'src/lib/platform/security/content-security-policy.ts',
  code: `'connect-src': [
    'self',
    'https://huggingface.co',
    'https://*.hf.co',
    'https://*.huggingface.co',
    'https://cdn.jsdelivr.net',
    'https:',
  ],`,
};

const CATALOG_TYPE: SourceSnippet = {
  label: 'Catalog',
  file: 'src/lib/domains/catalog/domain/catalog.ts',
  code: `type CatalogAuth =
  | { readonly kind: 'none' }
  | { readonly kind: 'basic'; readonly username: string };

type Catalog = {
  readonly id: CatalogId;
  readonly title: string;
  readonly protocol: CatalogProtocol;
  readonly rootUrl: string;
  readonly auth: CatalogAuth;
};`,
};

const ACQUISITION_TYPE: SourceSnippet = {
  label: 'Acquisition',
  file: 'src/lib/domains/catalog/domain/remote-publication.ts',
  code: `type AcquisitionFormat = 'epub' | 'pdf' | 'cbz';

type Acquisition = {
  readonly href: string;
  readonly format: AcquisitionFormat;
  readonly mediaType: string;
  readonly length: number | null;
};`,
};

const PUBLICATION_TYPE: SourceSnippet = {
  label: 'RemotePublication',
  file: 'src/lib/domains/catalog/domain/remote-publication.ts',
  code: `type RemotePublication = {
  readonly catalogId: CatalogId;
  readonly entryId: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly language: Language | null;
  readonly summary: string;
  readonly updated: string;
  readonly cover: RemoteImage | null;
  readonly acquisition: Acquisition | null;
  readonly feedPath: FeedPath;
};`,
};

const ORIGIN_TYPE: SourceSnippet = {
  label: 'BookOrigin',
  file: 'src/lib/domains/catalog/domain/book-origin.ts',
  code: `type BookOrigin = {
  readonly bookId: BookId;
  readonly catalogId: CatalogId;
  readonly entryId: string;
  readonly acquisition: Acquisition;
  readonly updated: string;
  readonly feedPath: FeedPath;
  readonly feedPosition: number;
  readonly downloadedAt: number;
};`,
};

const REMOTE_ITEM_TYPE: SourceSnippet = {
  label: 'RemoteItem',
  file: 'src/lib/domains/catalog/domain/remote-item.ts',
  code: `type RemoteItem =
  | { readonly kind: 'remote'; readonly publication: RemotePublication }
  | { readonly kind: 'unsupported'; readonly publication: RemotePublication }
  | {
      readonly kind: 'downloading';
      readonly publication: RemotePublication;
      readonly progress: number | null;
    }
  | {
      readonly kind: 'download-failed';
      readonly publication: RemotePublication;
      readonly reason: string;
    }
  | {
      readonly kind: 'held';
      readonly publication: RemotePublication;
      readonly bookId: BookId;
    }
  | {
      readonly kind: 'held-older';
      readonly publication: RemotePublication;
      readonly bookId: BookId;
    };`,
};

const FEED_PATH_TYPE: SourceSnippet = {
  label: 'FeedPath',
  file: 'src/lib/domains/catalog/domain/remote-publication.ts',
  code: `type FeedStep = { readonly title: string; readonly href: string };

type FeedPath = readonly FeedStep[];`,
};

const FEED_PATH_LABEL: SourceSnippet = {
  label: 'The label of a feed path',
  file: 'src/lib/domains/catalog/domain/remote-publication.ts',
  code: `function feedPathLabel(path: FeedPath): string {
  return path.map((step) => step.title).join(FEED_PATH_SEPARATOR);
}`,
};

const DOWNLOAD_ORIGIN: SourceSnippet = {
  label: 'The download writes the origin',
  file: 'src/lib/domains/catalog/use-cases/download-publication.ts',
  code: `const opened = await deps.openFile([downloaded.file], matching, defaults);
  if (opened.kind !== 'added' && opened.kind !== 'restored' && opened.kind !== 'already-held') {
    return opened;
  }

  const bookId = opened.book.id;
  const recorded = await deps.origins.put(
    bookOriginOf(publication, downloaded.acquisition, bookId, feedPosition, deps.now()),
  );
  if (recorded.kind !== 'success') return recorded;`,
};

const PASSWORDS_PORT: SourceSnippet = {
  label: 'The password port',
  file: 'src/lib/domains/catalog/domain/catalog-passwords.ts',
  code: `interface CatalogPasswords {
  get(id: CatalogId): string | null;
  set(id: CatalogId, password: string): void;
  forget(id: CatalogId): void;
}`,
};

const PASSWORDS_SESSION: SourceSnippet = {
  label: 'The only adapter of that port',
  file: 'src/lib/domains/catalog/adapters/session-catalog-passwords.ts',
  code: `class SessionCatalogPasswords implements CatalogPasswords {
  readonly #held = new Map<CatalogId, string>();`,
};

const STAGED_SWAP: SourceSnippet = {
  label: 'Replacing the files of a held book',
  file: 'src/lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
  code: `await blobs.put(staged.source, source, report);
      if (cover !== null) await blobs.put(staged.cover, cover);
      await blobs.replace(staged.source, keys.source);
      if (cover === null) await blobs.remove(keys.cover);
      else await blobs.replace(staged.cover, keys.cover);`,
};

const OPFS_MOVE: SourceSnippet = {
  label: 'The OPFS replace',
  file: 'src/lib/platform/opfs/blob-store.ts',
  code: `async function replace(stagedKey: string, key: string): Promise<void> {
  const parent = await directory();
  const handle: MovableHandle = await parent.getFileHandle(flatName(stagedKey));
  if (handle.move === undefined) throw new Error(UNSUPPORTED_MOVE);
  await handle.move(parent, flatName(key));
}`,
};

const SEARCH_DEBOUNCE: SourceSnippet = {
  label: 'The search delay',
  file: 'src/lib/domains/catalog/ui/feed-search.svelte.ts',
  code: `const SEARCH_DEBOUNCE_MS = 400;`,
};

const FEED_PAGE_TYPE: SourceSnippet = {
  label: 'FeedPage',
  file: 'src/lib/domains/catalog/domain/catalog-feed.ts',
  code: `type NavigationFeedPage = Page<LinkEntry, FeedAddress> &
  FeedFields & { readonly kind: 'navigation' };

type AcquisitionFeedPage = Page<PublicationEntry, FeedAddress> &
  FeedFields & { readonly kind: 'acquisition' };

type FeedPage = NavigationFeedPage | AcquisitionFeedPage;`,
};

const PAGED_FEED_READ: SourceSnippet = {
  label: 'A feed read as pages, in CatalogFeedData.svelte',
  file: 'src/lib/domains/catalog/ui/CatalogFeedData.svelte',
  code: `const feed = readPagedQuery<FeedEntry, FeedPageParam, FeedProblem, FeedPage, FeedKey>(
    () => catalogFeedQuery(cases, catalog.id, location, path),`,
};

const FEED_CACHE_TIMES: SourceSnippet = {
  label: 'How long a feed stays cached',
  file: 'src/lib/domains/catalog/queries/catalog-feed-queries.ts',
  code: `const FEED_STALE_MS = 5 * 60 * 1000;

const FEED_GC_MS = 30 * 60 * 1000;`,
};

const REMOTE_SNIPPETS: readonly SourceSnippet[] = [
  CONNECT_SOURCES,
  CATALOG_TYPE,
  ACQUISITION_TYPE,
  PUBLICATION_TYPE,
  ORIGIN_TYPE,
  REMOTE_ITEM_TYPE,
  FEED_PATH_TYPE,
  FEED_PATH_LABEL,
  DOWNLOAD_ORIGIN,
  PASSWORDS_PORT,
  PASSWORDS_SESSION,
  STAGED_SWAP,
  OPFS_MOVE,
  SEARCH_DEBOUNCE,
  FEED_PAGE_TYPE,
  PAGED_FEED_READ,
  FEED_CACHE_TIMES,
];

export {
  ACQUISITION_TYPE,
  CATALOG_TYPE,
  CONNECT_SOURCES,
  DOWNLOAD_ORIGIN,
  FEED_CACHE_TIMES,
  FEED_PAGE_TYPE,
  FEED_PATH_LABEL,
  FEED_PATH_TYPE,
  OPFS_MOVE,
  ORIGIN_TYPE,
  PAGED_FEED_READ,
  PASSWORDS_PORT,
  PASSWORDS_SESSION,
  PUBLICATION_TYPE,
  REMOTE_ITEM_TYPE,
  REMOTE_SNIPPETS,
  SEARCH_DEBOUNCE,
  STAGED_SWAP,
};
