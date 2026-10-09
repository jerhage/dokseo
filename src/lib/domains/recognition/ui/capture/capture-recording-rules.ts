import type { TextQuote } from '$lib/shared/anchor';
import type { BookId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

type RecordingGuard = 'no-regions' | 'no-open-book' | 'nothing-selected';

type RecordingStart =
  | { readonly kind: 'dispatch'; readonly book: BookId }
  | { readonly kind: 'stopped'; readonly guard: RecordingGuard };

function noteStart(regions: readonly ImageRegion[], book: BookId | null): RecordingStart {
  if (regions.length === 0) return { kind: 'stopped', guard: 'no-regions' };
  if (book === null) return { kind: 'stopped', guard: 'no-open-book' };

  return { kind: 'dispatch', book };
}

function liftStart(quote: TextQuote, book: BookId | null): RecordingStart {
  if (quote.exact.trim().length === 0) return { kind: 'stopped', guard: 'nothing-selected' };
  if (book === null) return { kind: 'stopped', guard: 'no-open-book' };

  return { kind: 'dispatch', book };
}

export { liftStart, noteStart };
export type { RecordingGuard, RecordingStart };
