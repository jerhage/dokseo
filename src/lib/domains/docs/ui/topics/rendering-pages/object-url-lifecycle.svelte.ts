import { describeCause } from '$lib/shared/cause';
import type { PixelSize } from '../../../domain/bitmap-memory';

type UrlStage =
  | { readonly kind: 'none' }
  | { readonly kind: 'creating' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'created'; readonly url: string; readonly bytes: number }
  | { readonly kind: 'revoked'; readonly url: string; readonly bytes: number };

type TryOutcome =
  | { readonly kind: 'image-loaded'; readonly size: PixelSize }
  | { readonly kind: 'failed'; readonly message: string };

type UrlAttempt = {
  readonly id: number;
  readonly stage: 'created' | 'revoked';
  readonly outcome: TryOutcome;
};

type ObjectUrlDeps = {
  readonly makeBlob: () => Promise<Blob>;
  readonly createUrl: (blob: Blob) => string;
  readonly revokeUrl: (url: string) => void;
  readonly loadImage: (url: string) => Promise<PixelSize>;
};

class ObjectUrlLifecycle {
  #stage = $state.raw<UrlStage>({ kind: 'none' });
  #attempts = $state.raw<readonly UrlAttempt[]>([]);
  #next = 0;
  readonly #deps: ObjectUrlDeps;

  constructor(deps: ObjectUrlDeps) {
    this.#deps = deps;
  }

  get stage(): UrlStage {
    return this.#stage;
  }

  get attempts(): readonly UrlAttempt[] {
    return this.#attempts;
  }

  async create(): Promise<void> {
    if (this.#stage.kind === 'creating' || this.#stage.kind === 'created') return;
    this.#stage = { kind: 'creating' };
    this.#attempts = [];
    let blob: Blob;
    try {
      blob = await this.#deps.makeBlob();
    } catch (cause) {
      this.#stage = { kind: 'failed', message: describeCause(cause) };
      return;
    }
    const url = this.#deps.createUrl(blob);
    this.#stage = { kind: 'created', url, bytes: blob.size };
  }

  revoke(): void {
    const stage = this.#stage;
    if (stage.kind !== 'created') return;
    this.#deps.revokeUrl(stage.url);
    this.#stage = { kind: 'revoked', url: stage.url, bytes: stage.bytes };
  }

  async loadAgain(): Promise<void> {
    const stage = this.#stage;
    if (stage.kind !== 'created' && stage.kind !== 'revoked') return;
    const outcome = await this.#outcomeOf(stage.url);
    this.#next += 1;
    this.#attempts = [...this.#attempts, { id: this.#next, stage: stage.kind, outcome }];
  }

  dispose(): void {
    this.revoke();
  }

  async #outcomeOf(url: string): Promise<TryOutcome> {
    try {
      const size = await this.#deps.loadImage(url);
      return { kind: 'image-loaded', size };
    } catch (cause) {
      return { kind: 'failed', message: describeCause(cause) };
    }
  }
}

export { ObjectUrlLifecycle };
export type { ObjectUrlDeps, TryOutcome, UrlAttempt, UrlStage };
