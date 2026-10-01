import { match, P } from 'ts-pattern';
import { knownStoredValue } from '$lib/shared/corrupt-row';
import { contentHash } from '$lib/shared/ids';
import type { ContentHash, ImageIndex } from '$lib/shared/ids';
import { isLanguage } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { isLayoutKind, isPagePairing, isReadingDirection } from '$lib/shared/layout-kind';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { isPageFit } from '$lib/shared/page-fit';
import {
  imagePlace,
  NO_FRACTION_REPORTED,
  textPlace,
  TOP_OF_THE_IMAGE,
} from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { defaultPageFit, DEFAULT_PAGE_PAIRING, isSourceKind } from './book';
import type { Book } from './book';

const NO_CONTENT_HASH = contentHash('');

const NO_FILE_NAME = '';

const FALLBACK_LANGUAGE: Language = 'ja';

const FALLBACK_DIRECTION: ReadingDirection = 'rtl';

type StoredPlace =
  | {
      readonly kind: 'image';
      readonly index: ImageIndex;
      readonly shownThrough?: ImageIndex;
      readonly offset?: number;
    }
  | { readonly kind: 'text'; readonly cfi: string; readonly fraction?: number | null };

type StoredBook = Omit<
  Book,
  | 'language'
  | 'layoutKind'
  | 'direction'
  | 'sourceKind'
  | 'pagePairing'
  | 'pageFit'
  | 'position'
  | 'contentHash'
  | 'fileName'
  | 'lastReadAt'
  | 'finishedAt'
> & {
  readonly language: unknown;
  readonly layoutKind: unknown;
  readonly direction: unknown;
  readonly sourceKind: unknown;
  readonly pagePairing?: unknown;
  readonly pageFit?: unknown;
  readonly position: ImageIndex | StoredPlace;
  readonly contentHash?: ContentHash;
  readonly fileName?: string;
  readonly lastReadAt?: number | null;
  readonly finishedAt?: number | null;
};

function storedPlace(position: ImageIndex | StoredPlace): ReadingPlace {
  return match(position)
    .with(P.number, (index) => imagePlace(index))
    .with({ kind: 'image' }, (at) =>
      imagePlace(at.index, at.shownThrough ?? at.index, at.offset ?? TOP_OF_THE_IMAGE),
    )
    .with({ kind: 'text' }, (at) => textPlace(at.cfi, at.fraction ?? NO_FRACTION_REPORTED))
    .exhaustive();
}

function bookFromStored(stored: StoredBook): Book {
  const layoutKind = knownStoredValue('book', 'layout kind', stored.layoutKind, isLayoutKind);
  return {
    ...stored,
    language: isLanguage(stored.language) ? stored.language : FALLBACK_LANGUAGE,
    layoutKind,
    direction: isReadingDirection(stored.direction) ? stored.direction : FALLBACK_DIRECTION,
    sourceKind: knownStoredValue('book', 'source kind', stored.sourceKind, isSourceKind),
    pagePairing: isPagePairing(stored.pagePairing) ? stored.pagePairing : DEFAULT_PAGE_PAIRING,
    pageFit: isPageFit(stored.pageFit) ? stored.pageFit : defaultPageFit(layoutKind),
    position: storedPlace(stored.position),
    contentHash: stored.contentHash ?? NO_CONTENT_HASH,
    fileName: stored.fileName ?? NO_FILE_NAME,
    lastReadAt: stored.lastReadAt ?? null,
    finishedAt: stored.finishedAt ?? null,
  };
}

export { FALLBACK_DIRECTION, FALLBACK_LANGUAGE, NO_CONTENT_HASH, NO_FILE_NAME, bookFromStored };
export type { StoredBook, StoredPlace };
