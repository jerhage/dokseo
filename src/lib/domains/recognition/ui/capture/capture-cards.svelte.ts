import { match } from 'ts-pattern';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import type { Anchor, TextAnchor } from '$lib/shared/anchor';
import type { CaptureOrigin } from '$lib/shared/capture-origin';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { captureHref } from '$lib/shared/reader-location';
import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import type { TextSegment } from '$lib/shared/text-search';
import { firstRegion } from '../../domain/capture/capture-arrival';
import { inBookOrder } from '../../domain/capture/capture-order';
import type { PassageOrder } from '../../domain/capture/capture-order';
import type { SearchedCapture } from '../../domain/capture/capture-results';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import type { ModelLoad } from '../../domain/model/model-load';
import type { Tag } from '../../domain/tag/tag';
import { captureNote, captureState } from './capture-card';
import { markedLines } from './capture-lines';
import type { MarkedLines } from './capture-lines';
import { cardChapter, placeLabel, placeLanguage } from './capture-place';
import type { CardChapter } from './capture-place';
import type { CaptureStatus, PanelCapture } from './panel-capture';
import { NO_REVEAL, revealCard } from './capture-reveal';
import type { CaptureReveal } from './capture-reveal';
import { readCaptureSort, saveCaptureSort } from './capture-sort';
import type { CaptureSort } from './capture-sort';
import { NOTHING_READ } from './capture-view.svelte';
import { modelLoadNote } from '../engine/engine-warmup.svelte';
import { chipsOf } from './tag-chip';
import type { TagChip } from './tag-chip';

type Card = {
  readonly id: CaptureId;
  readonly place: string;
  readonly placeLanguage: Language | null;
  readonly href: string | null;
  readonly passage: TextAnchor | null;
  readonly chapter: CardChapter | null;
  readonly stateLabel: string;
  readonly text: string | null;
  readonly segments: readonly TextSegment[] | null;
  readonly note: string | null;
  readonly annotation: string | null;
  readonly annotationSegments: readonly TextSegment[] | null;
  readonly noteLabel: string | null;
  readonly tags: readonly TagChip[];
  readonly tone: CaptureStatus;
  readonly origin: CaptureOrigin;
  readonly edited: boolean;
  readonly editable: boolean;
};

type CardSource = {
  readonly captures: readonly PanelCapture[];
  readonly newestFirst: readonly PanelCapture[];
  readonly tags: readonly Tag[];
  readonly book: BookId | null;
  readonly language: Language | null;
  readonly progress: ModelLoad | null;
  readonly direction: ReadingDirection;
  readonly passages: PassageOrder;
  readonly seekable: boolean;
};

type CardPlacing = {
  readonly tags: readonly Tag[];
  readonly book: BookId | null;
  readonly language: Language | null;
  readonly progress: ModelLoad | null;
  readonly seekable: boolean;
  readonly carried: string | null;
};

type MatchStep = {
  readonly query: string;
  readonly at: number;
};

type Done = Extract<PanelCapture, { status: 'done' }>;

type Hit = {
  readonly capture: Done;
  readonly anchor: Anchor;
  readonly lines: MarkedLines;
};

type CardJump =
  | { readonly kind: 'nowhere' }
  | { readonly kind: 'fresh'; readonly href: string }
  | { readonly kind: 'replacing'; readonly href: string };

const NOWHERE: CardJump = { kind: 'nowhere' };

function hrefOf(anchor: Anchor, placing: CardPlacing): string | null {
  const book = placing.book;
  const region = firstRegion(anchor);
  if (book === null || region === null) return null;

  return captureHref(book, region, placing.carried);
}

function passageOf(anchor: Anchor, seekable: boolean): TextAnchor | null {
  if (!seekable || anchor.kind !== 'text') return null;

  return anchor;
}

function annotationOf(capture: PanelCapture): string | null {
  return match(capture)
    .with({ origin: 'written' }, () => null)
    .with({ origin: 'recognized' }, (read) => read.note)
    .with({ origin: 'lifted' }, (lifted) => lifted.note)
    .exhaustive();
}

function noteLabelOf(capture: PanelCapture, place: string): string | null {
  if (capture.origin === 'written') return null;

  return annotationOf(capture) === null
    ? `Add a note to the capture at ${place}`
    : `Edit the note on the capture at ${place}`;
}

function searchedOf(capture: Done): SearchedCapture {
  return match(capture)
    .with({ origin: 'written' }, (note) => ({
      origin: 'written' as const,
      text: note.text.text,
    }))
    .with({ origin: 'recognized' }, (read) => ({
      origin: 'recognized' as const,
      text: read.text.text,
      note: read.note,
    }))
    .with({ origin: 'lifted' }, (lifted) => ({
      origin: 'lifted' as const,
      text: lifted.text.text,
      note: lifted.note,
    }))
    .exhaustive();
}

function cardOf(capture: PanelCapture, lines: MarkedLines | null, placing: CardPlacing): Card {
  const tags = chipsOf(capture.tagIds, placing.tags);
  const load = placing.progress;

  return match<PanelCapture, Card>(capture)
    .with({ status: 'pending' }, (running) => ({
      id: running.id,
      place: placeLabel(running.anchor),
      placeLanguage: placeLanguage(running.anchor, placing.language),
      href: hrefOf(running.anchor, placing),
      passage: passageOf(running.anchor, placing.seekable),
      chapter: null,
      stateLabel: 'Reading…',
      text: null,
      segments: null,
      note: load === null ? null : modelLoadNote(load),
      annotation: null,
      annotationSegments: null,
      noteLabel: null,
      tags,
      tone: 'pending',
      origin: running.origin,
      edited: false,
      editable: false,
    }))
    .with({ status: 'done' }, (read) => ({
      id: read.id,
      place: placeLabel(read.anchor),
      placeLanguage: placeLanguage(read.anchor, placing.language),
      href: hrefOf(read.anchor, placing),
      passage: passageOf(read.anchor, placing.seekable),
      chapter: cardChapter(read.anchor, placing.language),
      stateLabel: captureState(read.origin),
      text: read.text.text,
      segments: lines === null ? null : lines.text,
      note: captureNote(read.origin, read.text.text),
      annotation: annotationOf(read),
      annotationSegments: lines === null ? null : lines.note,
      noteLabel: noteLabelOf(read, placeLabel(read.anchor)),
      tags,
      tone: 'done',
      origin: read.origin,
      edited: read.edited,
      editable: true,
    }))
    .with({ status: 'empty' }, (blank) => ({
      id: blank.id,
      place: placeLabel(blank.anchor),
      placeLanguage: placeLanguage(blank.anchor, placing.language),
      href: hrefOf(blank.anchor, placing),
      passage: passageOf(blank.anchor, placing.seekable),
      chapter: cardChapter(blank.anchor, placing.language),
      stateLabel: 'No text',
      text: null,
      segments: null,
      note: NOTHING_READ,
      annotation: null,
      annotationSegments: null,
      noteLabel: null,
      tags,
      tone: 'empty',
      origin: blank.origin,
      edited: false,
      editable: false,
    }))
    .with({ status: 'failed' }, (broken) => ({
      id: broken.id,
      place: placeLabel(broken.anchor),
      placeLanguage: placeLanguage(broken.anchor, placing.language),
      href: hrefOf(broken.anchor, placing),
      passage: passageOf(broken.anchor, placing.seekable),
      chapter: cardChapter(broken.anchor, placing.language),
      stateLabel: 'Failed',
      text: null,
      segments: null,
      note: broken.message,
      annotation: null,
      annotationSegments: null,
      noteLabel: null,
      tags,
      tone: 'failed',
      origin: broken.origin,
      edited: false,
      editable: false,
    }))
    .exhaustive();
}

function hitOf(capture: PanelCapture, wanted: string): Hit | null {
  if (capture.status !== 'done') return null;

  const lines = markedLines(searchedOf(capture), wanted);
  return lines.matched ? { capture, anchor: capture.anchor, lines } : null;
}

class CaptureCards {
  query = $state('');

  #source: () => CardSource;
  #sort: RememberedChoice<CaptureSort>;
  #stepped = $state.raw<MatchStep | null>(null);
  #reveal: CaptureReveal = NO_REVEAL;

  #ordered = $derived.by<readonly PanelCapture[]>(() => {
    const held = this.#source();

    return match(this.#sort.value)
      .with('book', () => inBookOrder(held.captures, held.direction, held.passages))
      .with('newest', () => held.newestFirst)
      .exhaustive();
  });

  #hits = $derived.by<readonly Hit[] | null>(() => {
    if (!this.searching) return null;

    return this.#ordered
      .map((capture) => hitOf(capture, this.wanted))
      .filter((hit) => hit !== null);
  });

  #cards = $derived.by<readonly Card[]>(() => {
    const held = this.#source();
    const placing: CardPlacing = {
      tags: held.tags,
      book: held.book,
      language: held.language,
      progress: held.progress,
      seekable: held.seekable,
      carried: this.searching ? this.wanted : null,
    };

    const found = this.#hits;
    return found === null
      ? this.#ordered.map((capture) => cardOf(capture, null, placing))
      : found.map((hit) => cardOf(hit.capture, hit.lines, placing));
  });

  #cursor = $derived.by<number>(() => {
    const stepped = this.#stepped;
    if (!this.searching || stepped === null || stepped.query !== this.wanted) return NO_MATCH;

    return stepped.at;
  });

  constructor(source: () => CardSource, locate?: LocateStore) {
    this.#source = source;
    this.#sort = new RememberedChoice(
      () => readCaptureSort(locate),
      (sort) => saveCaptureSort(sort, locate),
    );
  }

  get sort(): CaptureSort {
    return this.#sort.value;
  }

  sortBy(sort: CaptureSort): void {
    this.#sort.choose(sort);
  }

  reveals(id: CaptureId, latest: CaptureId | null, visible: boolean): boolean {
    const step = revealCard(this.#reveal, id, latest, visible);
    this.#reveal = step.state;
    return step.scroll;
  }

  get wanted(): string {
    return this.query.trim();
  }

  get searching(): boolean {
    return this.wanted.length > 0;
  }

  get cards(): readonly Card[] {
    return this.#cards;
  }

  get cursor(): number {
    return this.#cursor;
  }

  jumpTo(at: number): CardJump {
    const card = this.#cards[at];
    if (card === undefined || card.href === null) return NOWHERE;

    const href = card.href;
    const replacing = this.#cursor >= 0;
    this.#stepped = this.searching ? { query: this.wanted, at } : null;

    return replacing ? { kind: 'replacing', href } : { kind: 'fresh', href };
  }
}

export { cardOf, hitOf, CaptureCards };
export type { Card, CardSource, CardPlacing, CardJump, Hit };
