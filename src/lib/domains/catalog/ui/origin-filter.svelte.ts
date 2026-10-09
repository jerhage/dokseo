import type { Catalog } from '../domain/catalog';
import { ALL_FILTER, parsedFilter } from './origin-filter';
import type { OriginFilter } from './origin-filter';

function createOriginFilter(
  initial: OriginFilter = ALL_FILTER,
  onchange: (chosen: OriginFilter) => void = () => undefined,
) {
  let chosen = $state.raw<OriginFilter>(initial);

  return {
    get chosen(): OriginFilter {
      return chosen;
    },
    choose(value: string, catalogs: readonly Catalog[]): void {
      chosen = parsedFilter(value, catalogs);
      onchange(chosen);
    },
  };
}

export { createOriginFilter };
