import type { Acquisition } from './remote-publication';

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

type ReadFeedResult = { readonly kind: 'success'; readonly text: string } | ClientFailure;

type ReadImageResult = { readonly kind: 'success'; readonly image: Blob } | ClientFailure;

type DownloadResult = { readonly kind: 'success'; readonly file: File } | ClientFailure;

type DownloadProgress = (fraction: number | null) => void;

interface OpdsClient {
  readFeed(
    url: string,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadFeedResult>;
  readImage(
    url: string,
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

export type {
  CatalogCredentials,
  ClientFailure,
  DownloadProgress,
  DownloadResult,
  OpdsClient,
  ReadFeedResult,
  ReadImageResult,
};
