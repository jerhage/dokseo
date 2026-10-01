import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import type { BookId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import { CardDrafts } from './card-drafts.svelte';
import { CaptureEdits } from './capture-edits.svelte';
import { CaptureList } from './capture-list.svelte';
import { CaptureRecording } from './capture-recording.svelte';
import { CaptureRemoval } from './capture-removal.svelte';
import { CaptureTags } from './capture-tags.svelte';
import { ClearAll } from './clear-all.svelte';
import type { Settled } from './panel-capture';
import { ConsentGate } from '../engine/consent-gate.svelte';
import { EngineWarmup } from '../engine/engine-warmup.svelte';
import type { PendingRecognition } from '../engine/engine-warmup.svelte';
import { hasNoText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
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
  readonly list: CaptureList;
  readonly clearAll: ClearAll;
  readonly removal: CaptureRemoval;
  readonly edits: CaptureEdits;
  readonly tagging: CaptureTags;
  readonly recording: CaptureRecording;
  readonly consent: ConsentGate;
  readonly warmup: EngineWarmup;
  readonly drafts = new CardDrafts();
  #container: Container;

  constructor(container: Container, notify: Notify) {
    this.#container = container;
    this.list = new CaptureList(container, (tags) => this.tagging.adopt(tags));
    this.clearAll = new ClearAll(container, notify, this.list);
    this.removal = new CaptureRemoval(container, notify, this.list);
    this.edits = new CaptureEdits(container, notify, this.list);
    this.tagging = new CaptureTags(container, notify, this.list);
    this.recording = new CaptureRecording(container, notify, this.list, {
      open: (capture) => this.drafts.open('text', capture, '', null),
      close: (capture) => void this.drafts.abandon('text', capture),
    });
    this.consent = new ConsentGate(container, notify, () => this.list.generation);
    this.warmup = new EngineWarmup(container, () => this.list.generation, {
      stored: (language) => this.consent.takeAsAgreed(language),
    });
  }

  async open(book: BookId): Promise<void> {
    this.consent.forget();
    this.warmup.forget();
    this.drafts.clear();
    await this.list.open(book);
  }

  close(): void {
    this.list.forget();
    this.drafts.clear();
    this.consent.forget();
    this.warmup.close();
  }

  async warm(book: BookId, language: Language): Promise<void> {
    if (this.list.book !== book) return;

    await this.warmup.warm(language);
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

  async recognize(
    source: PageSource,
    language: Language,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
  ): Promise<void> {
    const held: PendingRecognition = { source, language, regions, arrangement };

    const admitted = await this.consent.admits(held);
    if (admitted) await this.#read(held);
  }

  async agree(): Promise<void> {
    const held = await this.consent.agree();
    if (held === null) return;

    await this.#read(held);
  }

  async #read(held: PendingRecognition): Promise<void> {
    await this.recording.recognizing(held.regions, () => this.#settlement(held));
  }

  async #settlement(held: PendingRecognition): Promise<Settled> {
    try {
      return settlementOf(await this.warmup.read(held));
    } catch (cause) {
      return {
        status: 'failed',
        message: `That capture could not be read: ${describeCause(cause)}`,
      };
    }
  }
}

export { NOTHING_READ, CaptureView };
