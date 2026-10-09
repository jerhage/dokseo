import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
import type { SearchFilter } from '../../domain/capture/quick-find';
import { paletteCursor } from './search-palette-rules';
import type { SearchScope } from './search-rows';

function createSearchPalette() {
  let shown = $state(false);
  let present = $state(false);
  let query = $state('');
  let scope = $state<SearchScope>('book');
  let filter = $state<SearchFilter>('everything');
  let at = $state(NO_MATCH);

  function choose(chosen: SearchScope): void {
    scope = chosen;
    at = NO_MATCH;
  }

  return {
    get shown(): boolean {
      return shown;
    },
    get present(): boolean {
      return present;
    },
    get query(): string {
      return query;
    },
    get scope(): SearchScope {
      return scope;
    },
    get filter(): SearchFilter {
      return filter;
    },
    get at(): number {
      return at;
    },
    setShown(next: boolean): void {
      shown = next;
    },
    setQuery(typed: string): void {
      query = typed;
    },
    reveal(chosen: SearchScope): void {
      shown = true;
      present = true;
      choose(chosen);
    },
    choose,
    hide(): void {
      shown = false;
    },
    gone(): void {
      present = false;
    },
    restart(): void {
      at = NO_MATCH;
    },
    toggleTags(): void {
      filter = filter === 'tags' ? 'everything' : 'tags';
      at = NO_MATCH;
    },
    moveBy(by: number, rowCount: number): number {
      at = clampedIndex(paletteCursor(at, rowCount), by, rowCount);
      return at;
    },
  };
}

type SearchPaletteHook = ReturnType<typeof createSearchPalette>;

export { createSearchPalette };
export type { SearchPaletteHook };
