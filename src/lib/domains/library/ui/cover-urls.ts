import type { BookId } from '$lib/shared/ids';

type Shown = {
  readonly blobs: ReadonlyMap<BookId, Blob>;
  readonly urls: ReadonlyMap<BookId, string>;
};

class CoverUrls {
  #held = new Map<Blob, string>();
  #shown: Shown | null = null;

  urlsFor(blobs: ReadonlyMap<BookId, Blob>): ReadonlyMap<BookId, string> {
    if (this.#shown?.blobs === blobs) return this.#shown.urls;

    const kept = new Map<Blob, string>();
    const urls = new Map<BookId, string>();
    for (const [id, blob] of blobs) {
      const url = kept.get(blob) ?? this.#held.get(blob) ?? URL.createObjectURL(blob);
      kept.set(blob, url);
      urls.set(id, url);
    }
    for (const [blob, url] of this.#held) {
      if (!kept.has(blob)) URL.revokeObjectURL(url);
    }

    this.#held = kept;
    this.#shown = { blobs, urls };
    return urls;
  }

  dispose(): void {
    for (const url of this.#held.values()) URL.revokeObjectURL(url);
    this.#held = new Map();
    this.#shown = null;
  }
}

export { CoverUrls };
