import { match } from 'ts-pattern';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import { readerHref } from '$lib/shared/reader-location';
import type { Capture } from '../../domain/capture/capture';
import type { BookMatches } from '../../domain/capture/capture-results';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';
import type { AlsoTagged, TagSummary } from '../../domain/tag/tag-summary';
import { capturedLabel, firstImage, pageLabel, placeLabel } from '../capture/capture-place';
import { chipsOf } from '../capture/tag-chip';
import type { TagChip } from '../capture/tag-chip';
import type { TagViewStatus } from './tag-view.svelte';

type TagStage =
  | { readonly kind: 'loading' }
  | { readonly kind: 'no-tags' }
  | { readonly kind: 'unchosen' }
  | { readonly kind: 'empty'; readonly tag: Tag; readonly summary: TagSummary }
  | { readonly kind: 'chosen'; readonly tag: Tag; readonly summary: TagSummary };

type TaggedRow = {
  readonly id: CaptureId;
  readonly order: number;
  readonly href: string;
  readonly page: string;
  readonly place: string;
  readonly when: string | null;
  readonly text: string;
  readonly chips: readonly TagChip[];
};

type TaggedShelf = {
  readonly id: BookId;
  readonly title: string;
  readonly language: Language;
  readonly cover: string | null;
  readonly rows: readonly TaggedRow[];
};

type Neighbour = {
  readonly id: TagId;
  readonly name: string;
  readonly colour: TagColour;
  readonly count: number;
};

type WalkPress = {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly defaultPrevented: boolean;
};

type WalkKey =
  | { readonly kind: 'none' }
  | { readonly kind: 'move'; readonly by: 1 | -1 }
  | { readonly kind: 'open' }
  | { readonly kind: 'open-in-new-tab' };

type StageInput = {
  readonly tag: Tag | undefined;
  readonly summary: TagSummary | null;
  readonly tags: number;
  readonly status: TagViewStatus;
};

type ShelfInput = {
  readonly groups: readonly BookMatches<Capture>[];
  readonly covers: ReadonlyMap<BookId, string>;
  readonly chosen: TagId | null;
  readonly tags: readonly Tag[];
  readonly now: number;
};

function tagStage(input: StageInput): TagStage {
  const { tag, summary } = input;

  if (tag !== undefined && summary !== null) {
    return summary.captures === 0
      ? { kind: 'empty', tag, summary }
      : { kind: 'chosen', tag, summary };
  }

  if (input.tags > 0) return { kind: 'unchosen' };

  return match(input.status)
    .with('idle', 'loading', (): TagStage => ({ kind: 'loading' }))
    .with('ready', 'failed', (): TagStage => ({ kind: 'no-tags' }))
    .exhaustive();
}

function taggedShelves(input: ShelfInput): readonly TaggedShelf[] {
  let order = 0;

  return input.groups
    .map((group) => ({
      id: group.book.id,
      title: group.book.title,
      language: group.book.language,
      cover: input.covers.get(group.book.id) ?? null,
      rows: group.captures
        .map((capture): TaggedRow | null => {
          const index = firstImage(capture.anchor);
          if (index === null) return null;

          return {
            id: capture.id,
            order: order++,
            href: readerHref(group.book.id, index, { capture: capture.id, query: null }),
            page: pageLabel(index),
            place: placeLabel(capture.anchor),
            when: capturedLabel(capture.createdAt, input.now),
            text: capture.text,
            chips: chipsOf(
              capture.tagIds.filter((carried) => carried !== input.chosen),
              input.tags,
            ),
          };
        })
        .filter((row) => row !== null),
    }))
    .filter((shelf) => shelf.rows.length > 0);
}

function shelvedRows(shelves: readonly TaggedShelf[]): readonly TaggedRow[] {
  return shelves.flatMap((shelf) => shelf.rows);
}

function neighboursOf(
  also: readonly AlsoTagged[],
  tagsById: ReadonlyMap<TagId, Tag>,
): readonly Neighbour[] {
  return also.flatMap((other) => {
    const tag = tagsById.get(other.id);
    if (tag === undefined) return [];

    return [{ id: tag.id, name: tag.name, colour: tag.colour, count: other.count }];
  });
}

function summaryText(summary: TagSummary): string {
  const captures = `${summary.captures} ${summary.captures === 1 ? 'capture' : 'captures'}`;
  const documents = `${summary.documents} ${summary.documents === 1 ? 'document' : 'documents'}`;

  return `${captures} across ${documents}`;
}

function addedText(summary: TagSummary, now: number): string | null {
  return summary.lastAdded === null ? null : capturedLabel(summary.lastAdded, now);
}

function taggedCount(rows: number): string {
  return `${rows} ${rows === 1 ? 'capture' : 'captures'} tagged`;
}

function walkKey(press: WalkPress, rows: number, cursor: number): WalkKey {
  if (press.defaultPrevented || rows === 0) return { kind: 'none' };

  if (press.key === 'ArrowDown' || press.key === 'ArrowUp') {
    if (press.metaKey || press.ctrlKey || press.altKey) return { kind: 'none' };

    return { kind: 'move', by: press.key === 'ArrowDown' ? 1 : -1 };
  }

  if (press.key !== 'Enter' || cursor === NO_MATCH) return { kind: 'none' };

  return press.metaKey || press.ctrlKey ? { kind: 'open-in-new-tab' } : { kind: 'open' };
}

export {
  addedText,
  neighboursOf,
  shelvedRows,
  summaryText,
  tagStage,
  taggedCount,
  taggedShelves,
  walkKey,
};
export type { Neighbour, TagStage, TaggedRow, TaggedShelf, WalkKey, WalkPress };
