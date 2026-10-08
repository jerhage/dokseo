import type { FeedSearch } from '../domain/catalog-feed';
import type {
  CatalogCredentials,
  CatalogSource,
  DownloadProgress,
  DownloadResult,
  FeedPlacement,
  ReadFeedResult,
  ReadImageResult,
} from '../domain/catalog-source';
import { SEARCH_PLACEHOLDER, readOpdsFeed } from '../domain/opds-feed';
import type { Acquisition } from '../domain/remote-publication';
import type { HttpCatalogClient } from './http-catalog-client';

function searchAddress(search: FeedSearch, query: string): string {
  return search.handle.replaceAll(SEARCH_PLACEHOLDER, encodeURIComponent(query.trim()));
}

class OpdsCatalogSource implements CatalogSource {
  readonly #http: HttpCatalogClient;

  constructor(http: HttpCatalogClient) {
    this.#http = http;
  }

  async readFeed(
    address: string,
    placement: FeedPlacement,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadFeedResult> {
    const fetched = await this.#http.readText(address, credentials, signal);
    if (fetched.kind !== 'success') return fetched;
    const reading = readOpdsFeed(fetched.text, address, placement.catalogId, placement.path);
    if (reading.kind === 'not-a-feed') return { kind: 'not-a-catalog' };
    return { kind: 'success', reading };
  }

  search(
    search: FeedSearch,
    query: string,
    placement: FeedPlacement,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadFeedResult> {
    return this.readFeed(searchAddress(search, query), placement, credentials, signal);
  }

  readImage(
    address: string,
    credentials: CatalogCredentials,
    signal?: AbortSignal,
  ): Promise<ReadImageResult> {
    return this.#http.readImage(address, credentials, signal);
  }

  download(
    acquisition: Acquisition,
    credentials: CatalogCredentials,
    fallbackName: string,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ): Promise<DownloadResult> {
    return this.#http.download(acquisition, credentials, fallbackName, onProgress, signal);
  }
}

export { OpdsCatalogSource, searchAddress };
