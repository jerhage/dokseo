import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Anchor, TextQuote } from '$lib/shared/anchor';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import type { ClearScope } from './clearing';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import type { ReaderArrival } from '$lib/shared/reader-location';
import { CaptureCollection } from './capture-collection.svelte';
import type { PanelCapture, Settled } from './capture-collection.svelte';
import { RecognizerView } from '../engine/recognizer-view.svelte';
import type { ConsentRequest, PendingRecognition } from '../engine/recognizer-view.svelte';
import type { Arrival, ArrivalCapture } from '../../domain/capture/capture-arrival';
import type { Tag } from '../../domain/tag/tag';
import type { ModelLoad } from '../../domain/model/model-load';
import type { EngineState } from '../../domain/engine/ocr-engine';
import { hasNoText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { CropError } from '../../domain/engine/region-cropper';
import type { RecognitionError } from '../../domain/engine/text-recognizer';
import type { RecognizeRegionError } from '../../use-cases/engine/recognize-region';

const NOTHING_READ = 'Nothing was read in that selection.';

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

class CaptureView {
  #container: Container;
  #collection: CaptureCollection;
  #recognizer: RecognizerView;

  constructor(container: Container) {
    this.#container = container;
    this.#collection = new CaptureCollection(container);
    this.#recognizer = new RecognizerView(container, () => this.#collection.generation);
  }

  get captures(): readonly PanelCapture[] {
    return this.#collection.captures;
  }

  get writing(): CaptureId | null {
    return this.#collection.writing;
  }

  get confirmingClear(): boolean {
    return this.#collection.confirmingClear;
  }

  get tags(): readonly Tag[] {
    return this.#collection.tags;
  }

  get libraryCounts(): ReadonlyMap<TagId, number> {
    return this.#collection.libraryCounts;
  }

  get progress(): ModelLoad | null {
    return this.#recognizer.progress;
  }

  get session(): RecognizerSession | null {
    return this.#recognizer.session;
  }

  get downloaded(): boolean {
    return this.#recognizer.downloaded;
  }

  get partlyDownloaded(): boolean {
    return this.#recognizer.partlyDownloaded;
  }

  get opening(): boolean {
    return this.#recognizer.opening;
  }

  get engineFailure(): string | null {
    return this.#recognizer.engineFailure;
  }

  get consentRequest(): ConsentRequest | null {
    return this.#recognizer.consentRequest;
  }

  get engine(): EngineState {
    return this.#recognizer.engine;
  }

  get clearing(): ClearScope {
    return this.#collection.clearing;
  }

  get count(): number {
    return this.#collection.count;
  }

  get book(): BookId | null {
    return this.#collection.book;
  }

  get bookCounts(): ReadonlyMap<TagId, number> {
    return this.#collection.bookCounts;
  }

  get anchors(): readonly Anchor[] {
    return this.#collection.anchors;
  }

  get newestFirst(): readonly PanelCapture[] {
    return this.#collection.newestFirst;
  }

  get read(): readonly ArrivalCapture[] {
    return this.#collection.read;
  }

  arrivalFrom(
    found: ReaderArrival | null,
    direction: ReadingDirection,
  ): Arrival<ArrivalCapture> | null {
    return this.#collection.arrivalFrom(found, direction);
  }

  async open(book: BookId): Promise<void> {
    this.#recognizer.forget();
    await this.#collection.open(book);
  }

  close(): void {
    this.#collection.forget();
    this.#recognizer.close();
  }

  async warm(book: BookId, language: Language): Promise<void> {
    if (this.#collection.book !== book) return;

    await this.#recognizer.warm(language);
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
    this.#collection.note(regions);
  }

  lift(cfi: string, quote: TextQuote): void {
    this.#collection.lift(cfi, quote);
  }

  async keepLifted(book: BookId, cfi: string, quote: TextQuote): Promise<void> {
    await this.#collection.keepLifted(book, cfi, quote);
  }

  async write(book: BookId, regions: readonly ImageRegion[]): Promise<void> {
    await this.#collection.write(book, regions);
  }

  takeWriting(): CaptureId | null {
    return this.#collection.takeWriting();
  }

  async recognize(
    source: PageSource,
    language: Language,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
  ): Promise<void> {
    const held: PendingRecognition = { source, language, regions, arrangement };

    const admitted = await this.#recognizer.admits(held);
    if (admitted) await this.#read(held);
  }

  async agree(): Promise<void> {
    const held = await this.#recognizer.agree();
    if (held === null) return;

    await this.#read(held);
  }

  decline(): void {
    this.#recognizer.decline();
  }

  async #read(held: PendingRecognition): Promise<void> {
    await this.#collection.recognizing(held.regions, () => this.#settlement(held));
  }

  async #settlement(held: PendingRecognition): Promise<Settled> {
    try {
      return settlementOf(await this.#recognizer.read(held));
    } catch (cause) {
      return {
        status: 'failed',
        message: `That capture could not be read: ${describeCause(cause)}`,
      };
    }
  }

  async edit(id: CaptureId, text: string): Promise<void> {
    await this.#collection.edit(id, text);
  }

  async annotate(id: CaptureId, note: string): Promise<void> {
    await this.#collection.annotate(id, note);
  }

  async remove(id: CaptureId): Promise<void> {
    await this.#collection.remove(id);
  }

  async loadTags(): Promise<void> {
    await this.#collection.loadTags();
  }

  async loadTagCounts(): Promise<void> {
    await this.#collection.loadTagCounts();
  }

  async addTag(id: CaptureId, tag: TagId): Promise<void> {
    await this.#collection.addTag(id, tag);
  }

  async removeTag(id: CaptureId, tag: TagId): Promise<void> {
    await this.#collection.removeTag(id, tag);
  }

  async createTag(id: CaptureId, name: string): Promise<void> {
    await this.#collection.createTag(id, name);
  }

  askClear(): void {
    this.#collection.askClear();
  }

  dismissClear(): void {
    this.#collection.dismissClear();
  }

  async clear(): Promise<void> {
    await this.#collection.clear();
  }
}

export { NOTHING_READ, CaptureView };
