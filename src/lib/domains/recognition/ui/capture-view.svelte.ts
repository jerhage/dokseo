import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import { captureId, type BookId, type CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import { oldestFirst, type Capture, type CaptureDraft } from '../domain/capture';
import { downloadMb, modelFootprint, type ModelFootprint } from '../domain/model-footprint';
import { hasNoText, recognizedText, type RecognizedText } from '../domain/recognized-text';
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

export type PanelCapture = (Taken & { readonly status: 'pending' }) | (Taken & Settled);

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

function cardOf(capture: Capture): PanelCapture {
  return {
    id: capture.id,
    regions: capture.regions,
    status: 'done',
    text: recognizedText(capture.text, capture.confidence),
  };
}

export class CaptureView {
  captures = $state.raw<readonly PanelCapture[]>([]);
  progress = $state.raw<number | null>(null);
  consentRequest = $state.raw<ConsentRequest | null>(null);

  #container: Container;
  #book: BookId | null = null;
  #generation = 0;
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

  get newestFirst(): readonly PanelCapture[] {
    return this.captures.toReversed();
  }

  async open(book: BookId): Promise<void> {
    const generation = this.#forget();
    this.#book = book;

    const listed = await this.#container.recognition.listCaptures(book).catch(() => null);

    if (generation !== this.#generation || listed === null || !listed.ok) return;
    this.captures = oldestFirst(listed.value).map(cardOf);
  }

  close(): void {
    this.#forget();
  }

  async recognize(
    source: PageSource,
    language: Language,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
  ): Promise<void> {
    const trace = this.#container.beginTrace('capture-gate');
    const held: Held = { source, language, regions, arrangement };

    const admitted = await this.#admits(trace, held);
    trace.end();
    if (admitted) await this.#read(held);
  }

  async #admits(trace: Trace, held: Held): Promise<boolean> {
    const language = held.language;
    if (held.regions.length === 0) {
      trace.step('stopped', { guard: 'no-regions' });
      return false;
    }

    const footprint = modelFootprint(language);
    if (footprint === null) {
      trace.step('reading', { gate: 'nothing-to-download', language });
      return true;
    }

    if (this.#agreed.has(language)) {
      trace.step('reading', { gate: 'agreed-this-session', language });
      return true;
    }

    const decision = await this.#container.recognition.readModelConsent(language);
    if (decision.ok && decision.value === 'granted') {
      this.#agreed.add(language);
      trace.step('reading', { gate: 'consent-stored', language });
      return true;
    }

    if (this.#declined.has(language)) {
      trace.step('stopped', { guard: 'declined-this-session', language });
      return false;
    }

    this.#held = held;
    this.consentRequest = { language, footprint };
    trace.step('asking', { gate: 'consent-dialog', language, downloadMb: downloadMb(footprint) });
    return false;
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
    const book = this.#book;
    this.#running += 1;
    const id = captureId(crypto.randomUUID());
    this.captures = [...this.captures, { id, regions: held.regions, status: 'pending' }];

    let settled: Settled;
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
      settled = settlementOf(read);
    } catch (cause) {
      settled = {
        status: 'failed',
        message: `That capture could not be read: ${describeCause(cause)}`,
      };
    } finally {
      this.#running -= 1;
      if (this.#running === 0) this.progress = null;
    }

    this.#settle(id, settled);
    if (book === null || settled.status !== 'done') return;

    await this.#keep({
      id,
      bookId: book,
      regions: held.regions,
      text: settled.text.text,
      confidence: settled.text.confidence,
    });
  }

  async clear(): Promise<void> {
    const book = this.#book;
    this.#generation += 1;
    this.captures = [];
    if (book === null) return;

    await this.#container.recognition.clearCaptures(book).catch(() => undefined);
  }

  async #keep(draft: CaptureDraft): Promise<void> {
    await this.#container.recognition.saveCapture(draft).catch(() => undefined);
  }

  #forget(): number {
    this.#book = null;
    this.#held = null;
    this.consentRequest = null;
    this.captures = [];
    this.#generation += 1;
    return this.#generation;
  }

  #settle(id: CaptureId, settled: Settled): void {
    this.captures = this.captures.map((capture) =>
      capture.id === id ? { id: capture.id, regions: capture.regions, ...settled } : capture,
    );
  }
}
