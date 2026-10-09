import { match } from 'ts-pattern';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { Notify } from '$lib/shared/notice';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { engineMismatch } from '../../domain/engine/ocr-engine';
import { modelLoadAnnouncement } from '../engine/model-load-text';
import type { DraftField, DraftSave } from './card-drafts-session.svelte';
import type { Card } from './capture-card-projection';
import type { CardSource } from './capture-card-rules';
import type { CaptureView } from './capture-view.svelte';
import type { FocusTarget } from './focus-target';
import type { ClipboardWrite } from './text-copy.svelte';

type PanelSource = {
  readonly view: CaptureView;
  readonly language: Language | null;
  readonly direction: ReadingDirection;
  readonly passages: PassageOrder;
  readonly seekable: boolean;
};

type TagCounting = {
  readonly counts: () => ReadonlyMap<TagId, number>;
  readonly ask: () => void;
};

function writtenIn(field: DraftField, card: Card): string {
  return match(field)
    .with('note', () => card.annotation ?? '')
    .with('text', () => card.text ?? '')
    .exhaustive();
}

class CapturePanelView {
  readonly counting: TagCounting;
  readonly write: ClipboardWrite;
  readonly notify: Notify;

  #source: () => PanelSource;

  #mismatch = $derived.by(() =>
    engineMismatch(this.#view().warmup.session, this.#source().language),
  );
  #announcement = $derived.by(() =>
    this.#view().list.captures.some((capture) => capture.status === 'pending')
      ? modelLoadAnnouncement(this.#view().warmup.progress)
      : '',
  );

  constructor(
    source: () => PanelSource,
    counting: TagCounting,
    write: ClipboardWrite,
    notify: Notify,
  ) {
    this.#source = source;
    this.counting = counting;
    this.write = write;
    this.notify = notify;
  }

  #view(): CaptureView {
    return this.#source().view;
  }

  get mismatch(): string | null {
    return this.#mismatch;
  }

  get announcement(): string {
    return this.#announcement;
  }

  get cardSource(): CardSource {
    const held = this.#source();
    return {
      captures: held.view.list.captures,
      newestFirst: held.view.list.newestFirst,
      tags: held.view.tagging.tags,
      book: held.view.list.book,
      language: held.language,
      progress: held.view.warmup.progress,
      direction: held.direction,
      passages: held.passages,
      seekable: held.seekable,
    };
  }

  openDraft(field: DraftField, card: Card, from: FocusTarget | null): void {
    this.#view().drafts.open(field, card.id, writtenIn(field, card), from);
  }

  abandon(field: DraftField, capture: CaptureId): FocusTarget | null {
    return this.#view().drafts.abandon(field, capture);
  }

  save(field: DraftField, capture: CaptureId): Promise<DraftSave> {
    return this.#view().drafts.save(field, capture, (written) =>
      match(field)
        .with('text', () => this.#view().edits.edit(capture, written))
        .with('note', () => this.#view().edits.annotate(capture, written))
        .exhaustive(),
    );
  }

  async remove(capture: CaptureId): Promise<void> {
    const removed = await this.#view().removal.remove(capture);
    if (removed === 'saved') this.#view().drafts.forget(capture);
  }
}

export { CapturePanelView, writtenIn };
export type { PanelSource, TagCounting };
