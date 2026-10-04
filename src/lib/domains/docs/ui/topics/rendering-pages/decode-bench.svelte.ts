import { describeCause } from '$lib/shared/cause';
import { decodedBytes } from '../../../domain/bitmap-memory';
import type { PixelSize } from '../../../domain/bitmap-memory';

type DecodeSample = 'page' | 'scan' | 'slice';

type DecodeStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'preparing'; readonly sample: DecodeSample }
  | { readonly kind: 'decoding'; readonly sample: DecodeSample }
  | { readonly kind: 'failed'; readonly sample: DecodeSample; readonly message: string };

type DecodedSample = {
  readonly id: number;
  readonly sample: DecodeSample;
  readonly encodedBytes: number;
  readonly size: PixelSize;
  readonly decodeMs: number;
  readonly bitmap: ImageBitmap;
  readonly closedSize: PixelSize | null;
};

type DecodeBenchDeps = {
  readonly blobFor: (sample: DecodeSample) => Promise<Blob>;
  readonly decode: (blob: Blob) => Promise<ImageBitmap>;
  readonly now: () => number;
};

class DecodeBench {
  #status = $state.raw<DecodeStatus>({ kind: 'idle' });
  #decoded = $state.raw<readonly DecodedSample[]>([]);
  #next = 0;
  readonly #deps: DecodeBenchDeps;

  constructor(deps: DecodeBenchDeps) {
    this.#deps = deps;
  }

  get status(): DecodeStatus {
    return this.#status;
  }

  get decoded(): readonly DecodedSample[] {
    return this.#decoded;
  }

  get heldBytes(): number {
    return this.#decoded
      .filter((entry) => entry.closedSize === null)
      .reduce((total, entry) => total + decodedBytes(entry.size), 0);
  }

  get busy(): boolean {
    return this.#status.kind === 'preparing' || this.#status.kind === 'decoding';
  }

  async decode(sample: DecodeSample): Promise<void> {
    if (this.busy) return;
    this.#status = { kind: 'preparing', sample };
    try {
      const blob = await this.#deps.blobFor(sample);
      this.#status = { kind: 'decoding', sample };
      const started = this.#deps.now();
      const bitmap = await this.#deps.decode(blob);
      const decodeMs = this.#deps.now() - started;
      this.#next += 1;
      const entry: DecodedSample = {
        id: this.#next,
        sample,
        encodedBytes: blob.size,
        size: { width: bitmap.width, height: bitmap.height },
        decodeMs,
        bitmap,
        closedSize: null,
      };
      this.#decoded = [entry, ...this.#decoded];
      this.#status = { kind: 'idle' };
    } catch (cause) {
      this.#status = { kind: 'failed', sample, message: describeCause(cause) };
    }
  }

  close(id: number): void {
    this.#decoded = this.#decoded.map((entry) => {
      if (entry.id !== id || entry.closedSize !== null) return entry;
      entry.bitmap.close();
      return {
        ...entry,
        closedSize: { width: entry.bitmap.width, height: entry.bitmap.height },
      };
    });
  }

  closeAll(): void {
    for (const entry of this.#decoded) this.close(entry.id);
  }

  dispose(): void {
    this.closeAll();
    this.#decoded = [];
  }
}

export { DecodeBench };
export type { DecodeBenchDeps, DecodeSample, DecodeStatus, DecodedSample };
