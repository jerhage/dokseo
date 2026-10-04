import { describeCause } from '$lib/shared/cause';
import { hashedBooks } from './identity-demos';
import type { HashedBook, UploadFile } from './identity-demos';

type Digest =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running' }
  | { readonly kind: 'done'; readonly hash: string; readonly ms: number }
  | { readonly kind: 'failed'; readonly message: string };

type HashFiles = {
  readonly partial: (blob: Blob) => Promise<string>;
  readonly whole: (blob: Blob) => Promise<string>;
  readonly now: () => number;
};

const IDLE: Digest = { kind: 'idle' };

const RUNNING: Digest = { kind: 'running' };

class HashedUpload<F extends UploadFile & Blob> {
  readonly book: HashedBook<F>;
  partial = $state.raw<Digest>(IDLE);
  whole = $state.raw<Digest>(IDLE);
  readonly #hash: HashFiles;

  constructor(book: HashedBook<F>, hash: HashFiles) {
    this.book = book;
    this.#hash = hash;
  }

  get hashedBlob(): Blob {
    const part = this.book.part;
    return part.kind === 'file' ? part.file : new Blob([part.manifest]);
  }

  async hashSamples(): Promise<void> {
    this.partial = RUNNING;
    this.partial = await this.#timed(this.#hash.partial, this.hashedBlob);
  }

  async hashEveryByte(): Promise<void> {
    if (this.book.part.kind !== 'file') return;
    this.whole = RUNNING;
    this.whole = await this.#timed(this.#hash.whole, this.book.part.file);
  }

  async #timed(digest: (blob: Blob) => Promise<string>, blob: Blob): Promise<Digest> {
    const started = this.#hash.now();
    try {
      const hash = await digest(blob);
      return { kind: 'done', hash, ms: this.#hash.now() - started };
    } catch (cause) {
      return { kind: 'failed', message: describeCause(cause) };
    }
  }
}

function hashUpload<F extends UploadFile & Blob>(
  files: readonly F[],
  hash: HashFiles,
): readonly HashedUpload<F>[] {
  const uploads = hashedBooks(files).map((book) => new HashedUpload(book, hash));
  for (const upload of uploads) void upload.hashSamples();
  return uploads;
}

export { HashedUpload, hashUpload };
export type { Digest, HashFiles };
