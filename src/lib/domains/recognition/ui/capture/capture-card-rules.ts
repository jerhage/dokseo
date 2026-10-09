import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { inBookOrder } from '../../domain/capture/capture-order';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import type { ModelLoad } from '../../domain/model/model-load';
import type { Tag } from '../../domain/tag/tag';
import { cardOf, hitOf } from './capture-card-projection';
import type { Card, CardPlacing, Hit } from './capture-card-projection';
import type { CaptureSort } from './capture-sort';
import type { PanelCapture } from './panel-capture';

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

function orderedCaptures(source: CardSource, sort: CaptureSort): readonly PanelCapture[] {
  return match(sort)
    .with('book', () => inBookOrder(source.captures, source.direction, source.passages))
    .with('newest', () => source.newestFirst)
    .exhaustive();
}

function searchHits(ordered: readonly PanelCapture[], wanted: string): readonly Hit[] | null {
  if (wanted.length === 0) return null;

  return ordered.map((capture) => hitOf(capture, wanted)).filter((hit) => hit !== null);
}

function cardsOf(
  source: CardSource,
  ordered: readonly PanelCapture[],
  hits: readonly Hit[] | null,
  wanted: string,
): readonly Card[] {
  const placing: CardPlacing = {
    tags: source.tags,
    book: source.book,
    language: source.language,
    progress: source.progress,
    seekable: source.seekable,
    carried: wanted.length > 0 ? wanted : null,
  };

  return hits === null
    ? ordered.map((capture) => cardOf(capture, null, placing))
    : hits.map((hit) => cardOf(hit.capture, hit.lines, placing));
}

function cursorOf(stepped: MatchStep | null, wanted: string): number {
  if (wanted.length === 0 || stepped === null || stepped.query !== wanted) return NO_MATCH;

  return stepped.at;
}

function jumpAt(cards: readonly Card[], at: number, cursor: number): CardJump {
  const card = cards[at];
  if (card === undefined || card.href === null) return NOWHERE;

  return cursor >= 0 ? { kind: 'replacing', href: card.href } : { kind: 'fresh', href: card.href };
}

export { cardsOf, cursorOf, jumpAt, orderedCaptures, searchHits };
export type { CardJump, CardSource, MatchStep };
