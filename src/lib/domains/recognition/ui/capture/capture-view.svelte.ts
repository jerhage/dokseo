import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import type { CaptureOrigin } from '$lib/shared/capture-origin';
import { captureId } from '$lib/shared/ids';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import type { ReaderArrival } from '$lib/shared/reader-location';
import { arrivalAt } from '../../domain/capture/capture-arrival';
import type { Arrival, ArrivalCapture } from '../../domain/capture/capture-arrival';
import { editedText, oldestFirst } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import { downloadMb } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { loadVerb } from '../../domain/model/model-load';
import type { ModelLoad } from '../../domain/model/model-load';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { EngineState } from '../../domain/engine/ocr-engine';
import { hasNoText, recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { CropError } from '../../domain/engine/region-cropper';
import type { RecognitionError } from '../../domain/engine/text-recognizer';
import type { RecognizeRegionError } from '../../use-cases/engine/recognize-region';

const NOTHING_READ = 'Nothing was read in that selection.';

const READING_SELECTION = 'Reading the selection.';

const FULL_PERCENT = 100;

function loadPercent(load: ModelLoad): number {
  return Math.round(load.fraction * FULL_PERCENT);
}

function modelLoadNote(load: ModelLoad): string {
  return `${loadVerb(load.source)} the model · ${loadPercent(load)}%`;
}

function modelLoadAnnouncement(load: ModelLoad | null): string {
  if (load === null) return READING_SELECTION;
  return `${loadVerb(load.source)} the recognition model, ${loadPercent(load)} percent.`;
}

type CaptureStatus = 'pending' | 'done' | 'empty' | 'failed';

type Taken = {
  readonly id: CaptureId;
  readonly regions: readonly ImageRegion[];
  readonly origin: CaptureOrigin;
};

type Settled =
  | { readonly status: 'done'; readonly text: RecognizedText; readonly edited: boolean }
  | { readonly status: 'empty' }
  | { readonly status: 'failed'; readonly message: string };

type PanelCapture = (Taken & { readonly status: 'pending' }) | (Taken & Settled);

type MarkedCapture = ArrivalCapture & { readonly origin: CaptureOrigin };

type ConsentRequest = {
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

  return hasNoText(read.value)
    ? { status: 'empty' }
    : { status: 'done', text: read.value, edited: false };
}

function cardOf(capture: Capture): PanelCapture {
  return {
    id: capture.id,
    regions: capture.regions,
    origin: capture.origin,
    status: 'done',
    text: recognizedText(capture.text, capture.confidence),
    edited: capture.editedAt !== null,
  };
}

class CaptureView {
  captures = $state.raw<readonly PanelCapture[]>([]);
  writing = $state.raw<CaptureId | null>(null);
  progress = $state.raw<ModelLoad | null>(null);
  session = $state.raw<RecognizerSession | null>(null);
  downloaded = $state.raw(false);
  partlyDownloaded = $state.raw(false);
  opening = $state.raw(false);
  engineFailure = $state.raw<string | null>(null);
  consentRequest = $state.raw<ConsentRequest | null>(null);

  #container: Container;
  #book = $state.raw<BookId | null>(null);
  #generation = 0;
  #running = 0;
  #warmedAt = -1;
  #opened: Language | null = null;
  #held: Held | null = null;
  #stored = new Map<CaptureId, Capture>();
  #agreed = new Set<Language>();
  #declined = new Set<Language>();

  constructor(container: Container) {
    this.#container = container;
  }

  get count(): number {
    return this.captures.length;
  }

  get book(): BookId | null {
    return this.#book;
  }

  get engine(): EngineState {
    return {
      stored: this.downloaded,
      opening: this.opening,
      load: this.progress,
      session: this.session,
      failure: this.engineFailure,
      paused: false,
      cancelled: false,
      partlyDownloaded: this.partlyDownloaded,
    };
  }

  get newestFirst(): readonly PanelCapture[] {
    return this.captures.toReversed();
  }

  get read(): readonly MarkedCapture[] {
    return this.captures
      .filter((capture) => capture.status === 'done')
      .map((capture) => ({
        id: capture.id,
        regions: capture.regions,
        text: capture.text.text,
        origin: capture.origin,
      }));
  }

  arrivalFrom(
    found: ReaderArrival | null,
    direction: ReadingDirection,
  ): Arrival<MarkedCapture> | null {
    if (found === null) return null;
    return arrivalAt(this.read, found.query, direction, found.capture);
  }

  async open(book: BookId): Promise<void> {
    const generation = this.#forget();
    this.#book = book;

    const listed = await this.#container.recognition.listCaptures(book).catch(() => null);

    if (generation !== this.#generation || listed === null || !listed.ok) return;

    const held = oldestFirst(listed.value);
    this.#stored = new Map(held.map((capture) => [capture.id, capture]));
    this.captures = held.map(cardOf);
  }

  close(): void {
    const opened = this.#opened;
    this.#forget();
    if (opened === null) return;

    void this.#container.recognition.closeRecognizer(opened);
  }

  async warm(book: BookId, language: Language): Promise<void> {
    if (this.#book !== book || this.#warmedAt === this.#generation) return;
    this.#warmedAt = this.#generation;

    const generation = this.#generation;
    const trace = this.#container.beginTrace('engine-warm');
    try {
      const model = await this.#chosenModel(language);
      if (generation !== this.#generation) return;
      if (model === null) {
        trace.step('stopped', { guard: 'no-model-for-language', language });
        return;
      }

      const held = await this.#container.recognition
        .readModelStorage(model.modelId)
        .catch(() => null);
      if (generation !== this.#generation) return;

      const snapshot = held !== null && held.ok ? held.value : null;
      this.downloaded = snapshot !== null && isStored(snapshot.report);
      this.partlyDownloaded =
        snapshot !== null &&
        !this.downloaded &&
        (isPartlyStored(snapshot.report) || isPartlyDownloaded(snapshot.partial));
      if (!this.downloaded) {
        trace.step('stopped', { guard: 'weights-not-on-disk', modelId: model.modelId });
        return;
      }

      this.#agreed.add(language);
      trace.step('opening', { language, modelId: model.modelId });
      await this.#openEngine(language, generation);
    } finally {
      trace.end();
    }
  }

  async #openEngine(language: Language, generation: number): Promise<void> {
    this.opening = true;
    this.engineFailure = null;
    this.#opened = language;

    try {
      const opened = await this.#container.recognition.prepareRecognizer(language, {
        onProgress: (load) => {
          if (generation === this.#generation) this.progress = load;
        },
        onSession: (session) => {
          if (generation === this.#generation) this.session = session;
        },
      });

      if (generation !== this.#generation) return;

      if (opened.ok) {
        this.session = opened.value;
        this.downloaded = true;
        this.partlyDownloaded = false;
      } else if (opened.error.kind === 'unavailable') {
        this.engineFailure = opened.error.cause;
      }
    } catch (cause) {
      if (generation === this.#generation) this.engineFailure = describeCause(cause);
    } finally {
      if (generation === this.#generation) {
        this.opening = false;
        if (this.#running === 0) this.progress = null;
      }
    }
  }

  async #chosenModel(language: Language): Promise<ModelFootprint | null> {
    const choice = await this.#container.recognition
      .readRecognizerSetup(language)
      .catch(() => null);

    return choice !== null && choice.ok ? choice.value.model : null;
  }

  capture(
    source: PageSource | null,
    language: Language | null,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
  ): void {
    const trace = this.#container.beginTrace('capture');
    try {
      if (source === null || language === null) {
        trace.step('stopped', {
          guard: 'no-open-book',
          hasSource: source !== null,
          language,
        });
        return;
      }

      trace.step('dispatched', { language, arrangement, regions: regions.length });
      void this.recognize(source, language, regions, arrangement);
    } finally {
      trace.end();
    }
  }

  note(regions: readonly ImageRegion[]): void {
    const book = this.#book;
    const trace = this.#container.beginTrace('note');
    try {
      if (regions.length === 0) {
        trace.step('stopped', { guard: 'no-regions' });
        return;
      }

      if (book === null) {
        trace.step('stopped', { guard: 'no-open-book' });
        return;
      }

      trace.step('dispatched', { regions: regions.length });
      void this.write(book, regions);
    } finally {
      trace.end();
    }
  }

  async write(book: BookId, regions: readonly ImageRegion[]): Promise<void> {
    const generation = this.#generation;
    const id = captureId(crypto.randomUUID());
    this.captures = [
      ...this.captures,
      {
        id,
        regions,
        origin: 'written',
        status: 'done',
        text: recognizedText('', null),
        edited: false,
      },
    ];
    this.writing = id;

    const written = await this.#container.recognition
      .writeNote(id, book, regions)
      .catch(() => null);
    if (written === null || !written.ok || generation !== this.#generation) return;

    this.#stored.set(written.value.id, written.value);
  }

  takeWriting(): CaptureId | null {
    const fresh = this.writing;
    this.writing = null;
    return fresh;
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

    if (this.#agreed.has(language)) {
      trace.step('reading', { gate: 'agreed-this-session', language });
      return true;
    }

    const footprint = await this.#chosenModel(language);
    if (footprint === null) {
      trace.step('reading', { gate: 'nothing-to-download', language });
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
    const generation = this.#generation;
    this.#opened = held.language;
    this.#running += 1;
    const id = captureId(crypto.randomUUID());
    this.captures = [
      ...this.captures,
      { id, regions: held.regions, origin: 'recognized', status: 'pending' },
    ];

    let settled: Settled;
    try {
      const read = await this.#container.recognition.recognizeRegion(
        held.language,
        held.source,
        held.regions,
        held.arrangement,
        {
          onProgress: (load) => {
            this.progress = load;
          },
          onSession: (opened) => {
            this.session = opened;
          },
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

    await this.#keep(generation, {
      id,
      bookId: book,
      regions: held.regions,
      text: settled.text.text,
      confidence: settled.text.confidence,
      origin: 'recognized',
    });
  }

  async edit(id: CaptureId, text: string): Promise<void> {
    const card = this.captures.find((capture) => capture.id === id);
    if (card === undefined || card.status !== 'done') return;

    const settled = editedText(card.text.text, text, card.origin);
    if (settled === card.text.text) return;

    const generation = this.#generation;
    const stored = this.#stored.get(id);
    const written =
      stored === undefined
        ? null
        : await this.#container.recognition.editCaptureText(stored, settled).catch(() => null);

    if (generation !== this.#generation) return;
    if (written !== null && written.ok) this.#stored.set(id, written.value);

    this.captures = this.captures.map((capture) =>
      capture.id === id && capture.status === 'done'
        ? { ...capture, text: recognizedText(settled, capture.text.confidence), edited: true }
        : capture,
    );
  }

  async remove(id: CaptureId): Promise<void> {
    const generation = this.#generation;
    if (this.#stored.has(id)) {
      await this.#container.recognition.removeCapture(id).catch(() => undefined);
    }

    if (generation !== this.#generation) return;

    this.#stored.delete(id);
    this.captures = this.captures.filter((capture) => capture.id !== id);
  }

  async clear(): Promise<void> {
    const book = this.#book;
    this.#generation += 1;
    this.captures = [];
    this.#stored = new Map();
    if (book === null) return;

    await this.#container.recognition.clearCaptures(book).catch(() => undefined);
  }

  async #keep(generation: number, draft: CaptureDraft): Promise<void> {
    const kept = await this.#container.recognition.saveCapture(draft).catch(() => null);
    if (kept === null || !kept.ok || generation !== this.#generation) return;

    this.#stored.set(kept.value.id, kept.value);
  }

  #forget(): number {
    this.#book = null;
    this.#held = null;
    this.#opened = null;
    this.session = null;
    this.progress = null;
    this.downloaded = false;
    this.partlyDownloaded = false;
    this.opening = false;
    this.engineFailure = null;
    this.consentRequest = null;
    this.captures = [];
    this.writing = null;
    this.#stored = new Map();
    this.#generation += 1;
    return this.#generation;
  }

  #settle(id: CaptureId, settled: Settled): void {
    this.captures = this.captures.map((capture) =>
      capture.id === id
        ? { id: capture.id, regions: capture.regions, origin: capture.origin, ...settled }
        : capture,
    );
  }
}

export { NOTHING_READ, READING_SELECTION, modelLoadNote, modelLoadAnnouncement, CaptureView };
export type { CaptureStatus, PanelCapture, MarkedCapture, ConsentRequest };
