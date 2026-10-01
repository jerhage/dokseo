import { match } from 'ts-pattern';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import { inBookOrder } from '../../domain/capture/capture-order';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import type { ModelLoad } from '../../domain/model/model-load';
import type { Tag } from '../../domain/tag/tag';
import { cardOf, hitOf } from './capture-card-projection';
import type { Card, CardPlacing, Hit } from './capture-card-projection';
import type { PanelCapture } from './panel-capture';
import { NO_REVEAL, revealCard } from './capture-reveal';
import type { CaptureReveal } from './capture-reveal';
import { readCaptureSort, saveCaptureSort } from './capture-sort';
import type { CaptureSort } from './capture-sort';

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

type MatchStep = {
  readonly query: string;
  readonly at: number;
};

type CardJump =
  | { readonly kind: 'nowhere' }
  | { readonly kind: 'fresh'; readonly href: string }
  | { readonly kind: 'replacing'; readonly href: string };

const NOWHERE: CardJump = { kind: 'nowhere' };

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

export { CaptureCards };
export type { CardJump, CardSource };
