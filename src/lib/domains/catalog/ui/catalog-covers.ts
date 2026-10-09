type ObjectUrls = {
  readonly create: (blob: Blob) => string;
  readonly revoke: (url: string) => void;
};

const BROWSER_OBJECT_URLS: ObjectUrls = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};

class CatalogCovers {
  #blobs: () => ReadonlyMap<string, Blob>;
  #objectUrls: ObjectUrls;
  #urls = new Map<Blob, string>();
  #disposed = false;

  constructor(
    blobs: () => ReadonlyMap<string, Blob>,
    objectUrls: ObjectUrls = BROWSER_OBJECT_URLS,
  ) {
    this.#blobs = blobs;
    this.#objectUrls = objectUrls;
  }

  urlOf(entryId: string): string | null {
    if (this.#disposed) return null;
    const blob = this.#blobs().get(entryId);
    if (blob === undefined) return null;
    const known = this.#urls.get(blob);
    if (known !== undefined) return known;
    const created = this.#objectUrls.create(blob);
    this.#urls.set(blob, created);
    return created;
  }

  clear(): void {
    for (const url of this.#urls.values()) this.#objectUrls.revoke(url);
    this.#urls = new Map();
  }

  dispose(): void {
    this.#disposed = true;
    this.clear();
  }
}

export { CatalogCovers };
export type { ObjectUrls };
