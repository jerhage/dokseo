import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import { captureId, type CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import { modelFootprint, type ModelFootprint } from '../domain/model-footprint';
import { hasNoText, type RecognizedText } from '../domain/recognized-text';
import type { CropError } from '../domain/region-cropper';
import type { RecognitionError } from '../domain/text-recognizer';
import type { RecognizeRegionError } from '../use-cases/recognize-region';

export const NOTHING_READ = 'Nothing was read in that selection.';

export type CaptureStatus = 'pending' | 'done' | 'empty' | 'failed';

type Taken = {
  readonly id: CaptureId;
  readonly regions: readonly ImageRegion[];
};

type Settled =
  | { readonly status: 'done'; readonly text: RecognizedText }
  | { readonly status: 'empty' }
  | { readonly status: 'failed'; readonly message: string };

export type Capture = (Taken & { readonly status: 'pending' }) | (Taken & Settled);

export type ConsentRequest = {
  readonly language: Language;
  readonly footprint: ModelFootprint;
};

type Held = {
  readonly source: PageSource;
  readonly language: Language;
  readonly regions: readonly ImageRegion[];
  readonly arrangement: Arrangement;
};

function describeCropFailure(error: CropError): string {
  return match(error)
    .with(
      { kind: 'nothing-selected' },
      () => 'That box covered no part of a page, so there was nothing to crop.',
    )
    .with(
      { kind: 'unreadable' },
      (unreadable) => `That page could not be cropped: ${unreadable.cause}`,
    )
    .exhaustive();
}

function describeRecognitionFailure(error: RecognitionError): string {
  return match(error)
    .with({ kind: 'no-text' }, () => NOTHING_READ)
    .with(
      { kind: 'model-unavailable' },
      (unavailable) => `The recognition model could not be loaded: ${unavailable.cause}`,
    )
    .with({ kind: 'recognition-failed' }, (failed) => `The recognizer failed: ${failed.cause}`)
    .exhaustive();
}

function describeRecognizeFailure(error: RecognizeRegionError): string {
  return match(error)
    .with({ kind: 'crop' }, (cropped) => describeCropFailure(cropped.error))
    .with({ kind: 'recognition' }, (read) => describeRecognitionFailure(read.error))
    .exhaustive();
}

function settlementOf(read: Result<RecognizedText, RecognizeRegionError>): Settled {
  if (!read.ok) {
    return read.error.kind === 'recognition' && read.error.error.kind === 'no-text'
      ? { status: 'empty' }
      : { status: 'failed', message: describeRecognizeFailure(read.error) };
  }

  return hasNoText(read.value) ? { status: 'empty' } : { status: 'done', text: read.value };
}

export class CaptureView {
  captures = $state.raw<readonly Capture[]>([]);
  progress = $state.raw<number | null>(null);
  consentRequest = $state.raw<ConsentRequest | null>(null);

  #container: Container;
  #taken = 0;
  #running = 0;
  #held: Held | null = null;
  #agreed = new Set<Language>();
  #declined = new Set<Language>();

  constructor(container: Container) {
    this.#container = container;
  }

  get count(): number {
    return this.captures.length;
  }

  get newestFirst(): readonly Capture[] {
    return this.captures.toReversed();
  }

  async recognize(
    source: PageSource,
    language: Language,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
  ): Promise<void> {
    if (regions.length === 0) return;

    const held: Held = { source, language, regions, arrangement };
    const footprint = modelFootprint(language);
    if (footprint === null || this.#agreed.has(language)) {
      await this.#read(held);
      return;
    }

    const decision = await this.#container.recognition.readModelConsent(language);
    if (decision.ok && decision.value === 'granted') {
      this.#agreed.add(language);
      await this.#read(held);
      return;
    }

    if (this.#declined.has(language)) return;

    this.#held = held;
    this.consentRequest = { language, footprint };
  }

  async agree(): Promise<void> {
    const held = this.#takeHeld();
    if (held === null) return;

    this.#agreed.add(held.language);
    await this.#container.recognition.grantModelConsent(held.language);
    await this.#read(held);
  }

  decline(): void {
    const held = this.#takeHeld();
    if (held === null) return;

    this.#declined.add(held.language);
  }

  #takeHeld(): Held | null {
    const held = this.#held;
    this.#held = null;
    this.consentRequest = null;
    return held;
  }

  async #read(held: Held): Promise<void> {
    this.#taken += 1;
    this.#running += 1;
    const id = captureId(`capture-${this.#taken}`);
    this.captures = [...this.captures, { id, regions: held.regions, status: 'pending' }];

    try {
      const read = await this.#container.recognition.recognizeRegion(
        held.language,
        held.source,
        held.regions,
        held.arrangement,
        (fraction) => {
          this.progress = fraction;
        },
      );
      this.#settle(id, settlementOf(read));
    } catch (cause) {
      this.#settle(id, {
        status: 'failed',
        message: `That capture could not be read: ${describeCause(cause)}`,
      });
    } finally {
      this.#running -= 1;
      if (this.#running === 0) this.progress = null;
    }
  }

  clear(): void {
    if (this.captures.length === 0) return;
    this.captures = [];
  }

  #settle(id: CaptureId, settled: Settled): void {
    this.captures = this.captures.map((capture) =>
      capture.id === id ? { id: capture.id, regions: capture.regions, ...settled } : capture,
    );
  }
}
