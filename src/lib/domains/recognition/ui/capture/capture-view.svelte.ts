import type { QueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import type { BookId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import type { PageSource } from '$lib/shared/page-source';
import { capturesQuery } from '../../queries/capture-queries';
import { CaptureCache } from './capture-cache';
import { CardDrafts } from './card-drafts.svelte';
import { NOTHING_READ } from './nothing-read';
import { CaptureEdits } from './capture-edits.svelte';
import { CaptureList } from './capture-list.svelte';
import type { CaptureListing } from './capture-read';
import { CaptureRecording } from './capture-recording.svelte';
import { CaptureRemoval } from './capture-removal.svelte';
import { CaptureTags } from './capture-tags.svelte';
import { ClearAll } from './clear-all.svelte';
import type { Settled } from './panel-capture';
import { ConsentGate } from '../engine/consent-gate.svelte';
import { EngineWarmup } from '../engine/engine-warmup.svelte';
import type { PendingRecognition } from '../engine/engine-warmup.svelte';
import type { CropError } from '../../domain/engine/region-cropper';
import type { RecognitionError } from '../../domain/engine/text-recognizer';
import type { RecognizeRegionResult } from '../../use-cases/engine/recognize-region';

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

function settlementOf(read: RecognizeRegionResult): Settled {
  return match(read)
    .returnType<Settled>()
    .with({ kind: 'success' }, ({ text }) => ({ status: 'done', text, edited: false }))
    .with({ kind: 'no-text' }, () => ({ status: 'empty' }))
    .with({ kind: 'nothing-selected' }, { kind: 'unreadable' }, (failure) => ({
      status: 'failed',
      message: describeCropFailure(failure),
    }))
    .with({ kind: 'model-unavailable' }, { kind: 'recognition-failed' }, (failure) => ({
      status: 'failed',
      message: describeRecognitionFailure(failure),
    }))
    .exhaustive();
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
  #client: QueryClient;
  #visits = 0;

  constructor(
    container: Container,
    notify: Notify,
    client: QueryClient,
    listing: () => CaptureListing | undefined,
  ) {
    const recognition = container.recognition;
    const cache = new CaptureCache(client);
    this.#container = container;
    this.#client = client;
    this.list = new CaptureList(listing);
    this.clearAll = new ClearAll(recognition, notify, this.list, cache);
    this.removal = new CaptureRemoval(recognition, notify, this.list, cache);
    this.edits = new CaptureEdits(recognition, notify, this.list, cache);
    this.tagging = new CaptureTags(recognition, notify, this.list, cache);
    this.recording = new CaptureRecording(container, notify, this.list, cache, {
      open: (capture) => this.drafts.open('text', capture, '', null),
      close: (capture) => void this.drafts.abandon('text', capture),
    });
    this.consent = new ConsentGate(container, notify, client, () => this.#visits);
    this.warmup = new EngineWarmup(container, client, () => this.#visits, {
      stored: (language) => this.consent.takeAsAgreed(language),
    });
  }

  async open(book: BookId): Promise<void> {
    this.#visits += 1;
    this.consent.forget();
    this.warmup.forget();
    this.drafts.clear();
    this.list.open(book);
    await this.#client
      .fetchQuery(capturesQuery(this.#container.recognition, book))
      .catch(() => undefined);
  }

  close(): void {
    this.#visits += 1;
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

export { CaptureView };
