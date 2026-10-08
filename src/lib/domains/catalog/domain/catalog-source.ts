import type { CatalogId } from '$lib/shared/ids';
import type { CatalogFeed, FeedSearch } from './catalog-feed';
import type { CatalogProtocol } from './catalog-protocol';
import type { Acquisition, FeedPath } from './remote-publication';

type CatalogCredentials =
  | { readonly kind: 'none' }
  | { readonly kind: 'basic'; readonly username: string; readonly password: string };

type ClientFailure =
  | { readonly kind: 'unauthorized' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'server-error'; readonly status: number }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'offline' }
  | { readonly kind: 'aborted' };

type FeedPlacement = { readonly catalogId: CatalogId; readonly path: FeedPath };

type ReadFeedResult =
  | { readonly kind: 'success'; readonly reading: CatalogFeed }
  | { readonly kind: 'not-a-catalog' }
  | ClientFailure;

type ReadImageResult = { readonly kind: 'success'; readonly image: Blob } | ClientFailure;

type DownloadResult = { readonly kind: 'success'; readonly file: File } | ClientFailure;

type DownloadProgress = (fraction: number | null) => void;

interface CatalogSource {
  readFeed(
    address: string,
    placement: FeedPlacement,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadFeedResult>;
  search(
    search: FeedSearch,
    query: string,
    placement: FeedPlacement,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadFeedResult>;
  readImage(
    address: string,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadImageResult>;
  download(
    acquisition: Acquisition,
    credentials: CatalogCredentials,
    fallbackName: string,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ): Promise<DownloadResult>;
}

type CatalogSourceFor = (protocol: CatalogProtocol) => Promise<CatalogSource>;

export type {
  CatalogCredentials,
  CatalogSource,
  CatalogSourceFor,
  ClientFailure,
  DownloadProgress,
  DownloadResult,
  FeedPlacement,
  ReadFeedResult,
  ReadImageResult,
};
