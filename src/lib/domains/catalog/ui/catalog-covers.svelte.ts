import type { ReadCatalogCoverResult } from '../use-cases/read-catalog-cover';
import type { RemotePublication } from '../domain/remote-publication';

type ReadCover = (url: string, signal: AbortSignal) => Promise<ReadCatalogCoverResult>;

type ObjectUrls = {
  readonly create: (blob: Blob) => string;
  readonly revoke: (url: string) => void;
};

const BROWSER_OBJECT_URLS: ObjectUrls = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};

class CatalogCovers {
  #urls = $state.raw<ReadonlyMap<string, string>>(new Map());
  #readCover: ReadCover;
  #objectUrls: ObjectUrls;
  #loading: AbortController | null = null;

  constructor(readCover: ReadCover, objectUrls: ObjectUrls = BROWSER_OBJECT_URLS) {
    this.#readCover = readCover;
    this.#objectUrls = objectUrls;
  }

  urlOf(entryId: string): string | null {
    return this.#urls.get(entryId) ?? null;
  }

  show(publications: readonly RemotePublication[]): Promise<void> {
    this.clear();
    return this.add(publications);
  }

  add(publications: readonly RemotePublication[]): Promise<void> {
    const loading = this.#loading ?? new AbortController();
    this.#loading = loading;
    return Promise.all(publications.map((publication) => this.#load(publication, loading))).then(
      () => undefined,
    );
  }

  clear(): void {
    this.#loading?.abort();
    this.#loading = null;
    for (const url of this.#urls.values()) this.#objectUrls.revoke(url);
    this.#urls = new Map();
  }

  async #load(publication: RemotePublication, loading: AbortController): Promise<void> {
    if (publication.cover === null) return;
    const read = await this.#readCover(publication.cover.href, loading.signal);
    if (read.kind !== 'success' || loading.signal.aborted) return;
    const url = this.#objectUrls.create(read.image);
    this.#urls = new Map(this.#urls).set(publication.entryId, url);
  }
}

export { CatalogCovers };
export type { ObjectUrls, ReadCover };
