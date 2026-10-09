import type { BookId, CatalogId } from '$lib/shared/ids';
import type { CoverReads, FeedReads, HeldReads } from '../queries/catalog-feed-queries';
import type { RemotePublication } from '../domain/remote-publication';
import type { ForgetDanglingOriginsResult } from '../use-cases/forget-dangling-origins';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import type { DownloadsChoices, DownloadsUseCases } from './catalog-downloads.svelte';
import type { CatalogSession } from './catalog-session.svelte';
import type { DescribeOpenFile } from './catalog-texts';
import type { createFeedSearch } from './feed-search.svelte';
import type { createNavigation } from './navigation.svelte';

type CatalogUseCases = DownloadsUseCases &
  FeedReads &
  CoverReads &
  HeldReads & {
    readonly unlockCatalog: (id: CatalogId, password: string) => UnlockCatalogResult;
    readonly forgetDanglingOrigins: (id: CatalogId) => Promise<ForgetDanglingOriginsResult>;
  };

type CatalogDeps = {
  readonly cases: CatalogUseCases;
  readonly session: CatalogSession;
  readonly navigation: ReturnType<typeof createNavigation>;
  readonly search: ReturnType<typeof createFeedSearch>;
  readonly choices: DownloadsChoices;
  readonly describeOpenFile: DescribeOpenFile;
  readonly readerHref: (id: BookId) => string;
  readonly downloaded: (publication: RemotePublication, bookId: BookId) => void;
  readonly updated: (publication: RemotePublication, bookId: BookId) => void;
  readonly refreshOrigins: () => Promise<void>;
};

export type { CatalogDeps, CatalogUseCases };
