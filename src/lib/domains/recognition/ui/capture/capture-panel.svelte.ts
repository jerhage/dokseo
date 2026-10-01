import { match } from 'ts-pattern';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { Notify } from '$lib/shared/notice';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { engineMismatch } from '../../domain/engine/ocr-engine';
import { modelLoadAnnouncement } from '../engine/engine-warmup.svelte';
import type { FocusTarget } from './card-editing.svelte';
import type { DraftField, DraftSave } from './card-drafts.svelte';
import { CaptureCards } from './capture-cards.svelte';
import type { Card } from './capture-card-projection';
import type { CardJump } from './capture-cards.svelte';
import type { CaptureView } from './capture-view.svelte';
import { clearWarning } from './clearing';
import { searchSteps } from './panel-search';
import type { SearchSteps } from './panel-search';
import { TagSelection } from './tag-selection.svelte';
import { TextCopy } from './text-copy.svelte';
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
  readonly cards: CaptureCards;
  readonly selection: TagSelection;
  readonly copying: TextCopy;

  #source: () => PanelSource;
  #tagFrom: FocusTarget | null = null;

  #mismatch = $derived.by(() =>
    engineMismatch(this.#view().warmup.session, this.#source().language),
  );
  #announcement = $derived.by(() =>
    this.#view().list.captures.some((capture) => capture.status === 'pending')
      ? modelLoadAnnouncement(this.#view().warmup.progress)
      : '',
  );
  #steps = $derived.by(() =>
    searchSteps(this.cards.cursor, this.cards.cards.length, this.#view().list.count),
  );
  #warning = $derived.by(() =>
    this.#view().clearAll.confirming ? clearWarning(this.#view().clearAll.scope) : null,
  );
  #tagging = $derived.by(
    () => this.cards.cards.find((card) => card.id === this.selection.picker.capture) ?? null,
  );

  constructor(
    source: () => PanelSource,
    counting: TagCounting,
    write: ClipboardWrite,
    notify: Notify,
    locate?: LocateStore,
  ) {
    this.#source = source;
    const view = (): CaptureView => source().view;

    this.cards = new CaptureCards(() => {
      const held = source();
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
    }, locate);

    this.selection = new TagSelection(
      {
        tagsOn: (id) => view().list.captures.find((capture) => capture.id === id)?.tagIds ?? [],
        loadCounts: () => counting.ask(),
        add: (id, tag) => view().tagging.addTag(id, tag),
        remove: (id, tag) => view().tagging.removeTag(id, tag),
        create: (id, name) => view().tagging.createTag(id, name),
      },
      () => ({ tags: view().tagging.tags, counts: counting.counts() }),
    );

    this.copying = new TextCopy(write, notify);
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

  get steps(): SearchSteps {
    return this.#steps;
  }

  get warning(): string | null {
    return this.#warning;
  }

  get tagging(): Card | null {
    return this.#tagging;
  }

  stepBy(by: number): CardJump {
    return this.cards.jumpTo(this.cards.cursor + by);
  }

  reveals(id: CaptureId, visible: boolean): boolean {
    return this.cards.reveals(id, this.#view().list.latest, visible);
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
    if (this.selection.opened(capture)) this.selection.close();
    const removed = await this.#view().removal.remove(capture);
    if (removed === 'saved') this.#view().drafts.forget(capture);
  }

  openTags(capture: CaptureId, from: FocusTarget): void {
    this.#tagFrom = from;
    this.selection.open(capture);
  }

  closeTags(): FocusTarget | null {
    if (this.selection.picker.capture === null) return null;

    this.selection.close();
    const from = this.#tagFrom;
    this.#tagFrom = null;
    return from;
  }
}

export { CapturePanelView, writtenIn };
export type { PanelSource, TagCounting };
