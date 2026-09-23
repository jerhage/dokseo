import { match } from 'ts-pattern';
import type { Anchor, TextAnchor } from '$lib/shared/anchor';
import type { CaptureOrigin } from '$lib/shared/capture-origin';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { readerHref } from '$lib/shared/reader-location';
import type { TextSegment } from '$lib/shared/text-search';
import { inBookOrder } from '../../domain/capture/capture-order';
import type { SearchedCapture } from '../../domain/capture/capture-results';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import type { ModelLoad } from '../../domain/model/model-load';
import type { Tag } from '../../domain/tag/tag';
import { captureNote, captureState } from './capture-card';
import { markedLines } from './capture-lines';
import type { MarkedLines } from './capture-lines';
import { firstImage, placeLabel } from './capture-place';
import type { CaptureStatus, PanelCapture } from './capture-collection.svelte';
import { NOTHING_READ } from './capture-view.svelte';
import { modelLoadNote } from '../engine/recognizer-view.svelte';
import { chipsOf } from './tag-chip';
import type { TagChip } from './tag-chip';

type Card = {
  readonly id: CaptureId;
  readonly place: string;
  readonly href: string | null;
  readonly passage: TextAnchor | null;
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
  readonly progress: ModelLoad | null;
  readonly direction: ReadingDirection;
  readonly seekable: boolean;
};

type CardPlacing = {
  readonly tags: readonly Tag[];
  readonly book: BookId | null;
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

function hrefOf(id: CaptureId, anchor: Anchor, placing: CardPlacing): string | null {
  const book = placing.book;
  const index = firstImage(anchor);
  if (book === null || index === null) return null;

  return readerHref(book, index, { capture: id, query: placing.carried });
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

  return match(capture)
    .with({ status: 'pending' }, (running) => ({
      id: running.id,
      place: placeLabel(running.anchor),
      href: hrefOf(running.id, running.anchor, placing),
      passage: passageOf(running.anchor, placing.seekable),
      stateLabel: 'Reading…',
      text: null,
      segments: null,
      note: load === null ? null : modelLoadNote(load),
      annotation: null,
      annotationSegments: null,
      noteLabel: null,
      tags,
      tone: 'pending' as CaptureStatus,
      origin: running.origin,
      edited: false,
      editable: false,
    }))
    .with({ status: 'done' }, (read) => ({
      id: read.id,
      place: placeLabel(read.anchor),
      href: hrefOf(read.id, read.anchor, placing),
      passage: passageOf(read.anchor, placing.seekable),
      stateLabel: captureState(read.origin),
      text: read.text.text,
      segments: lines === null ? null : lines.text,
      note: captureNote(read.origin, read.text.text),
      annotation: annotationOf(read),
      annotationSegments: lines === null ? null : lines.note,
      noteLabel: noteLabelOf(read, placeLabel(read.anchor)),
      tags,
      tone: 'done' as CaptureStatus,
      origin: read.origin,
      edited: read.edited,
      editable: true,
    }))
    .with({ status: 'empty' }, (blank) => ({
      id: blank.id,
      place: placeLabel(blank.anchor),
      href: hrefOf(blank.id, blank.anchor, placing),
      passage: passageOf(blank.anchor, placing.seekable),
      stateLabel: 'No text',
      text: null,
      segments: null,
      note: NOTHING_READ,
      annotation: null,
      annotationSegments: null,
      noteLabel: null,
      tags,
      tone: 'empty' as CaptureStatus,
      origin: blank.origin,
      edited: false,
      editable: false,
    }))
    .with({ status: 'failed' }, (broken) => ({
      id: broken.id,
      place: placeLabel(broken.anchor),
      href: hrefOf(broken.id, broken.anchor, placing),
      passage: passageOf(broken.anchor, placing.seekable),
      stateLabel: 'Failed',
      text: null,
      segments: null,
      note: broken.message,
      annotation: null,
      annotationSegments: null,
      noteLabel: null,
      tags,
      tone: 'failed' as CaptureStatus,
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
  #stepped = $state.raw<MatchStep | null>(null);

  #hits = $derived.by<readonly Hit[] | null>(() => {
    if (!this.searching) return null;

    const held = this.#source();
    const found = held.captures
      .map((capture) => hitOf(capture, this.wanted))
      .filter((hit) => hit !== null);

    return inBookOrder(found, held.direction);
  });

  #cards = $derived.by<readonly Card[]>(() => {
    const held = this.#source();
    const placing: CardPlacing = {
      tags: held.tags,
      book: held.book,
      progress: held.progress,
      seekable: held.seekable,
      carried: this.searching ? this.wanted : null,
    };

    const found = this.#hits;
    return found === null
      ? held.newestFirst.map((capture) => cardOf(capture, null, placing))
      : found.map((hit) => cardOf(hit.capture, hit.lines, placing));
  });

  #cursor = $derived.by<number>(() => {
    const stepped = this.#stepped;
    if (!this.searching || stepped === null || stepped.query !== this.wanted) return NO_MATCH;

    return stepped.at;
  });

  constructor(source: () => CardSource) {
    this.#source = source;
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
