import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import { segmentsOf, textMatches } from '$lib/shared/text-search';
import type { TextSegment } from '$lib/shared/text-search';
import type { Capture } from '../../domain/capture/capture';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { matchedTagIds } from '../../domain/capture/quick-find';
import type { QuickFinds } from '../../domain/capture/quick-find';
import type { Tag } from '../../domain/tag/tag';
import { markedLines } from './capture-lines';
import { bookHref, captureLink } from './capture-link';
import { firstImage, NO_PLACE, pageLabel, passageLabel, placeLanguage } from './capture-place';
import { bookLabel } from './removed-book-label';
import { chipsOf } from './tag-chip';
import type { TagChip } from './tag-chip';

type SearchScope = 'book' | 'all';

type RowChip = TagChip & { readonly matched: boolean };

type BookRow = {
  readonly kind: 'book';
  readonly key: string;
  readonly href: string;
  readonly language: Language;
  readonly cover: string | null;
  readonly segments: readonly TextSegment[];
  readonly images: number | null;
};

type CaptureRow = {
  readonly kind: 'capture';
  readonly key: CaptureId;
  readonly href: string | null;
  readonly place: string;
  readonly placeLanguage: Language | null;
  readonly title: string | null;
  readonly language: Language;
  readonly cover: string | null;
  readonly segments: readonly TextSegment[];
  readonly note: readonly TextSegment[] | null;
  readonly chips: readonly RowChip[];
};

type SearchRow = BookRow | CaptureRow;

type SearchSection = {
  readonly label: string;
  readonly from: number;
  readonly rows: readonly SearchRow[];
};

type SearchRowsInput = {
  readonly found: QuickFinds<Capture>;
  readonly scope: SearchScope;
  readonly book: BookId | null;
  readonly covers: ReadonlyMap<BookId, string>;
  readonly counts: ReadonlyMap<BookId, number>;
  readonly tags: readonly Tag[];
  readonly query: string;
};

type SearchRows = {
  readonly rows: readonly SearchRow[];
  readonly sections: readonly SearchSection[];
};

function effectiveScope(book: BookId | null, scope: SearchScope): SearchScope {
  return book === null ? 'all' : scope;
}

function searchedBooks(
  books: readonly SearchedBook[],
  book: BookId | null,
  scope: SearchScope,
): readonly SearchedBook[] {
  return books.filter((shelf) => scope === 'all' || shelf.id === book);
}

function bookRow(shelf: SearchedBook, input: SearchRowsInput): BookRow {
  return {
    kind: 'book',
    key: shelf.id,
    href: bookHref(shelf.id),
    language: shelf.language,
    cover: input.covers.get(shelf.id) ?? null,
    segments: segmentsOf(shelf.title, textMatches(shelf.title, input.query)),
    images: input.counts.get(shelf.id) ?? null,
  };
}

function rowPlace(anchor: Anchor): string {
  if (anchor.kind === 'text') return passageLabel(anchor);

  const index = firstImage(anchor);
  return index === null ? NO_PLACE : `p.${pageLabel(index)}`;
}

function captureRow(shelf: SearchedBook, capture: Capture, input: SearchRowsInput): CaptureRow {
  const lit = new Set(matchedTagIds(capture, input.tags, input.query));
  const lines = markedLines(capture, input.query);

  return {
    kind: 'capture',
    key: capture.id,
    href: shelf.removed ? null : captureLink(shelf.id, capture, input.query).href,
    place: rowPlace(capture.anchor),
    placeLanguage: placeLanguage(capture.anchor, shelf.language),
    title: shelf.id === input.book ? null : bookLabel(shelf),
    language: shelf.language,
    cover: input.covers.get(shelf.id) ?? null,
    segments: lines.text,
    note: lines.note,
    chips: chipsOf(capture.tagIds, input.tags).map((chip) => ({
      id: chip.id,
      name: chip.name,
      colour: chip.colour,
      matched: lit.has(chip.id),
    })),
  };
}

function searchRows(input: SearchRowsInput): SearchRows {
  const titled = input.scope === 'book' ? [] : input.found.books;
  const bookRows = titled.map((shelf) => bookRow(shelf, input));
  const captureRows = input.found.captures.flatMap((matched) =>
    matched.captures.map((capture) => captureRow(matched.book, capture, input)),
  );

  const sections = [
    { label: 'Books', from: 0, rows: bookRows },
    { label: 'Captures', from: bookRows.length, rows: captureRows },
  ].filter((group) => group.rows.length > 0);

  return { rows: [...bookRows, ...captureRows], sections };
}

export { effectiveScope, searchRows, searchedBooks };
export type {
  BookRow,
  CaptureRow,
  SearchRowsInput,
  SearchRow,
  SearchRows,
  SearchScope,
  SearchSection,
  RowChip,
};
