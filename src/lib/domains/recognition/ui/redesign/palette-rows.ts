import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import { readerHref } from '$lib/shared/reader-location';
import { segmentsOf, textMatches } from '$lib/shared/text-search';
import type { TextSegment } from '$lib/shared/text-search';
import type { Capture } from '../../domain/capture/capture';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { matchedTagIds } from '../../domain/capture/quick-find';
import type { QuickFinds } from '../../domain/capture/quick-find';
import type { Tag } from '../../domain/tag/tag';
import { markedLines } from '../capture/capture-lines';
import { firstImage, NO_PLACE, pageLabel } from '../capture/capture-place';
import { chipsOf } from '../capture/tag-chip';
import type { TagChip } from '../capture/tag-chip';

type PaletteScope = 'book' | 'all';

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
  readonly href: string;
  readonly place: string;
  readonly title: string | null;
  readonly language: Language;
  readonly cover: string | null;
  readonly segments: readonly TextSegment[];
  readonly note: readonly TextSegment[] | null;
  readonly chips: readonly RowChip[];
};

type PaletteRow = BookRow | CaptureRow;

type PaletteSection = {
  readonly label: string;
  readonly from: number;
  readonly rows: readonly PaletteRow[];
};

type PaletteInput = {
  readonly found: QuickFinds<Capture>;
  readonly scope: PaletteScope;
  readonly book: BookId | null;
  readonly covers: ReadonlyMap<BookId, string>;
  readonly counts: ReadonlyMap<BookId, number>;
  readonly tags: readonly Tag[];
  readonly query: string;
};

type PaletteRows = {
  readonly rows: readonly PaletteRow[];
  readonly sections: readonly PaletteSection[];
};

function bookHref(id: BookId): string {
  return `/read/${encodeURIComponent(id)}`;
}

function effectiveScope(book: BookId | null, scope: PaletteScope): PaletteScope {
  return book === null ? 'all' : scope;
}

function searchedBooks(
  books: readonly SearchedBook[],
  book: BookId | null,
  scope: PaletteScope,
): readonly SearchedBook[] {
  return books.filter((shelf) => scope === 'all' || shelf.id === book);
}

function bookRow(shelf: SearchedBook, input: PaletteInput): BookRow {
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

function captureRow(shelf: SearchedBook, capture: Capture, input: PaletteInput): CaptureRow {
  const index = firstImage(capture.anchor);
  const lit = new Set(matchedTagIds(capture, input.tags, input.query));
  const lines = markedLines(capture, input.query);

  return {
    kind: 'capture',
    key: capture.id,
    href:
      index === null
        ? bookHref(shelf.id)
        : readerHref(shelf.id, index, { capture: capture.id, query: input.query }),
    place: index === null ? NO_PLACE : `p.${pageLabel(index)}`,
    title: shelf.id === input.book ? null : shelf.title,
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

function paletteRows(input: PaletteInput): PaletteRows {
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

export { bookHref, effectiveScope, paletteRows, searchedBooks };
export type {
  BookRow,
  CaptureRow,
  PaletteInput,
  PaletteRow,
  PaletteRows,
  PaletteScope,
  PaletteSection,
  RowChip,
};
