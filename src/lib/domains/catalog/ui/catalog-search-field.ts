import { match } from 'ts-pattern';
import type { HeaderSearch } from '$lib/shared/header-search';
import type { Catalog } from '../domain/catalog';
import {
  fieldValue,
  searchMove,
  searchOffer,
  searchPlaceholder,
  UNKNOWN_OFFER,
} from './catalog-search';
import type { CatalogDeps } from './catalog-deps';
import type { EntryId } from './navigation';

type SearchDeps = Pick<CatalogDeps, 'navigation' | 'search' | 'session'>;

function offerOf(catalog: Catalog, deps: SearchDeps) {
  const place = deps.navigation.placeOf(catalog.id);
  if (place === null) return null;
  return { place, offer: searchOffer(deps.navigation.chain(place.id), deps.session.readings) };
}

function runSearch(catalog: Catalog, deps: SearchDeps, text: string): EntryId {
  const { navigation } = deps;
  const found = offerOf(catalog, deps);
  if (found === null || navigation.tab !== catalog.id) return navigation.current.id;
  return match(searchMove(text, found.place.location, found.offer))
    .returnType<EntryId>()
    .with({ kind: 'ignore' }, () => navigation.current.id)
    .with({ kind: 'leave' }, () => {
      navigation.leaveSearch(catalog.id);
      return navigation.current.id;
    })
    .with({ kind: 'search' }, ({ search, query }) => navigation.search(catalog.id, search, query))
    .exhaustive();
}

function searchFieldFor(catalog: Catalog, deps: SearchDeps): HeaderSearch {
  const { navigation, search } = deps;
  const found = offerOf(catalog, deps);
  const offer = found?.offer ?? UNKNOWN_OFFER;
  const value =
    found === null
      ? ''
      : fieldValue(search.draftOf(catalog.id), navigation.current.id, found.place.location);
  return {
    placeholder: searchPlaceholder(catalog.title, offer),
    disabled: offer.kind === 'absent',
    value,
    oninput: (text) =>
      search.type(catalog.id, text, navigation.current.id, (typed) =>
        runSearch(catalog, deps, typed),
      ),
    onsubmit: (text) => search.submit(catalog.id, text, (typed) => runSearch(catalog, deps, typed)),
  };
}

export { runSearch, searchFieldFor };
