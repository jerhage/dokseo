import { match } from 'ts-pattern';
import { knownStoredValue } from '$lib/shared/corrupt-row';
import { isLanguage } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { isLayoutKind, isPagePairing, isReadingDirection } from '$lib/shared/layout-kind';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { isPageFit } from '$lib/shared/page-fit';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { defaultPageFit, DEFAULT_PAGE_PAIRING, isSourceKind } from './book';
import type { Book } from './book';

const FALLBACK_LANGUAGE: Language = 'ja';

const FALLBACK_DIRECTION: ReadingDirection = 'rtl';

type StoredBook = Omit<
  Book,
  'language' | 'layoutKind' | 'direction' | 'sourceKind' | 'pagePairing' | 'pageFit'
> & {
  readonly language: unknown;
  readonly layoutKind: unknown;
  readonly direction: unknown;
  readonly sourceKind: unknown;
  readonly pagePairing: unknown;
  readonly pageFit: unknown;
};

function storedPlace(position: ReadingPlace): ReadingPlace {
  return match(position)
    .with({ kind: 'image' }, (at) => imagePlace(at.index, at.shownThrough, at.offset))
    .with({ kind: 'text' }, (at) => textPlace(at.cfi, at.fraction))
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
  };
}

export { FALLBACK_DIRECTION, FALLBACK_LANGUAGE, bookFromStored };
export type { StoredBook };
