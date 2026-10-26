import { storedPlace } from '$lib/domains/library/domain/book/stored-book';
import type { Book } from '$lib/domains/library/domain/book/book';
import {
  CorruptRow,
  isNumberOrNull,
  isStoredFields,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { match } from 'ts-pattern';
import { unreadableData } from './unreadable-data';
import type { UnreadableData } from './unreadable-data';

type PositionData =
  | {
      readonly kind: 'image';
      readonly index: number;
      readonly shownThrough: number;
      readonly offset: number;
      readonly lastReadAt: number | null;
      readonly finishedAt: number | null;
    }
  | {
      readonly kind: 'text';
      readonly cfi: string;
      readonly fraction: number | null;
      readonly lastReadAt: number | null;
      readonly finishedAt: number | null;
    };

type SyncedPosition = {
  readonly place: ReadingPlace;
  readonly lastReadAt: number | null;
  readonly finishedAt: number | null;
};

type PositionFromSyncData =
  | { readonly kind: 'success'; readonly position: SyncedPosition }
  | UnreadableData;

function toSyncPositionData(
  book: Pick<Book, 'position' | 'lastReadAt' | 'finishedAt'>,
): PositionData {
  const { position, lastReadAt, finishedAt } = book;
  return match(position)
    .returnType<PositionData>()
    .with({ kind: 'image' }, (place) => ({
      kind: 'image',
      index: place.index,
      shownThrough: place.shownThrough,
      offset: place.offset,
      lastReadAt,
      finishedAt,
    }))
    .with({ kind: 'text' }, (place) => ({
      kind: 'text',
      cfi: place.cfi,
      fraction: place.fraction,
      lastReadAt,
      finishedAt,
    }))
    .exhaustive();
}

function fromSyncPositionData(data: unknown): PositionFromSyncData {
  try {
    if (!isStoredFields(data)) throw new CorruptRow('position', 'data', data);
    const layoutKind = data['kind'] === 'text' ? 'flow' : 'paged';
    const place = storedPlace(data, layoutKind);
    const lastReadAt = knownStoredValue(
      'position',
      'last read time',
      data['lastReadAt'] ?? null,
      isNumberOrNull,
    );
    const finishedAt = knownStoredValue(
      'position',
      'finished time',
      data['finishedAt'] ?? null,
      isNumberOrNull,
    );
    return { kind: 'success', position: { place, lastReadAt, finishedAt } };
  } catch (cause) {
    return unreadableData(cause);
  }
}

export { fromSyncPositionData, toSyncPositionData };
export type { PositionData, PositionFromSyncData, SyncedPosition };
