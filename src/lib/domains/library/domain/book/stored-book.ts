import { match, P } from 'ts-pattern';
import { contentHash } from '$lib/shared/ids';
import type { ContentHash, ImageIndex } from '$lib/shared/ids';
import type { PagePairing } from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import { imagePlace, NO_FRACTION_REPORTED, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from './book';
import type { Book } from './book';

const NO_CONTENT_HASH = contentHash('');

type StoredPlace =
  | { readonly kind: 'image'; readonly index: ImageIndex }
  | { readonly kind: 'text'; readonly cfi: string; readonly fraction?: number | null };

type StoredBook = Omit<
  Book,
  'pagePairing' | 'pageFit' | 'position' | 'contentHash' | 'lastReadAt' | 'finishedAt'
> & {
  readonly pagePairing?: PagePairing;
  readonly pageFit?: PageFit;
  readonly position: ImageIndex | StoredPlace;
  readonly contentHash?: ContentHash;
  readonly lastReadAt?: number | null;
  readonly finishedAt?: number | null;
};

function storedPlace(position: ImageIndex | StoredPlace): ReadingPlace {
  return match(position)
    .with(P.number, (index) => imagePlace(index))
    .with({ kind: 'image' }, (at) => imagePlace(at.index))
    .with({ kind: 'text' }, (at) => textPlace(at.cfi, at.fraction ?? NO_FRACTION_REPORTED))
    .exhaustive();
}

function bookFromStored(stored: StoredBook): Book {
  return {
    ...stored,
    pagePairing: stored.pagePairing ?? DEFAULT_PAGE_PAIRING,
    pageFit: stored.pageFit ?? defaultPageFit(stored.layoutKind),
    position: storedPlace(stored.position),
    contentHash: stored.contentHash ?? NO_CONTENT_HASH,
    lastReadAt: stored.lastReadAt ?? null,
    finishedAt: stored.finishedAt ?? null,
  };
}

export { NO_CONTENT_HASH, bookFromStored };
export type { StoredBook, StoredPlace };
