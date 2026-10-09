import type { BookId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { PassageOrder } from '../../domain/capture/capture-order';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import { quickFinds } from '../../domain/capture/quick-find';
import type { QuickFinds, SearchFilter } from '../../domain/capture/quick-find';
import type { Tag } from '../../domain/tag/tag';
import type { CaptureFind } from './capture-find';
import { searchInvite, searchNote } from './search-copy';
import type { SearchNote, SearchRoom } from './search-copy';
import { searchRows, searchedBooks } from './search-rows';
import type { SearchRow, SearchRows, SearchScope } from './search-rows';

type PaletteSource = {
  readonly book: BookId | null;
  readonly books: readonly SearchedBook[];
  readonly covers: ReadonlyMap<BookId, string>;
  readonly counts: ReadonlyMap<BookId, number>;
  readonly tags: readonly Tag[];
  readonly captures: readonly Capture[];
  readonly passages: PassageOrder;
  readonly read: CaptureFind;
  readonly room: SearchRoom;
};

type PaletteQuery = {
  readonly present: boolean;
  readonly query: string;
  readonly scope: SearchScope;
  readonly filter: SearchFilter;
};

const NOTHING: QuickFinds<Capture> = { books: [], captures: [] };

function paletteResults(source: PaletteSource, asked: PaletteQuery): SearchRows {
  const found =
    asked.present && asked.query.trim().length > 0
      ? quickFinds(
          source.captures,
          searchedBooks(source.books, source.book, asked.scope),
          source.tags,
          asked.query,
          asked.filter,
          source.passages,
        )
      : NOTHING;

  return searchRows({
    found,
    scope: asked.scope,
    book: source.book,
    covers: source.covers,
    counts: source.counts,
    tags: source.tags,
    query: asked.query,
  });
}

function paletteCursor(at: number, rowCount: number): number {
  return at >= rowCount ? NO_MATCH : at;
}

function paletteNote(source: PaletteSource, asked: PaletteQuery, rowCount: number): SearchNote {
  return searchNote({
    read: source.read,
    query: asked.query,
    rows: rowCount,
    filter: asked.filter,
    scope: asked.scope,
  });
}

function paletteInvite(source: PaletteSource, asked: PaletteQuery): string {
  return searchInvite(asked.filter, asked.scope, source.room);
}

function rowAtCursor(rows: readonly SearchRow[], cursor: number): SearchRow | undefined {
  return rows[cursor === NO_MATCH ? 0 : cursor];
}

export { paletteCursor, paletteInvite, paletteNote, paletteResults, rowAtCursor };
export type { PaletteQuery, PaletteSource };
