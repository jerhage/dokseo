import { match } from 'ts-pattern';
import type { FeedSearch } from '../domain/catalog-feed';
import type { FeedReading } from './catalog-session.svelte';
import type { EntryId, Location, Place } from './navigation';

function searchPlaceholder(catalogName: string, offer: SearchOffer): string {
  return offer.kind === 'absent' ? `${catalogName} has no search` : `Search ${catalogName}`;
}

type SearchMove =
  | { readonly kind: 'ignore' }
  | { readonly kind: 'leave' }
  | { readonly kind: 'search'; readonly search: FeedSearch; readonly query: string };

type SearchDraft = { readonly text: string; readonly entry: EntryId };

type SearchOffer =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'offered'; readonly search: FeedSearch }
  | { readonly kind: 'absent' };

const UNKNOWN_OFFER: SearchOffer = { kind: 'unknown' };

const ABSENT_OFFER: SearchOffer = { kind: 'absent' };

function searchMove(query: string, shown: Location, offer: SearchOffer): SearchMove {
  const trimmed = query.trim();
  if (trimmed === '') return shown.kind === 'search' ? { kind: 'leave' } : { kind: 'ignore' };
  if (offer.kind !== 'offered') return { kind: 'ignore' };
  if (shown.kind === 'search' && shown.query.trim() === trimmed) return { kind: 'ignore' };
  return { kind: 'search', search: offer.search, query };
}

function searchOffer(
  chain: readonly Place[],
  readings: ReadonlyMap<string, FeedReading>,
): SearchOffer {
  const [shown] = chain;
  const root = chain.at(-1);
  const here = shown === undefined ? undefined : readings.get(shown.id);
  const top = root === undefined ? undefined : readings.get(root.id);
  const own = here?.kind === 'ready' ? here.search : null;
  const fallback = top?.kind === 'ready' ? top.search : null;
  const search = own ?? fallback;
  if (search !== null) return { kind: 'offered', search };
  return here === undefined ? UNKNOWN_OFFER : ABSENT_OFFER;
}

function fieldValue(draft: SearchDraft | null, entry: EntryId, shown: Location): string {
  const typed = match(shown)
    .returnType<string>()
    .with({ kind: 'search' }, ({ query }) => query)
    .with({ kind: 'root' }, { kind: 'feed' }, () => '')
    .exhaustive();
  if (draft === null) return typed;
  if (draft.entry === entry) return draft.text;
  const sameSearch = shown.kind === 'search' && shown.query.trim() === draft.text.trim();
  return sameSearch ? draft.text : typed;
}

export { UNKNOWN_OFFER, fieldValue, searchMove, searchOffer, searchPlaceholder };
export type { SearchDraft, SearchMove, SearchOffer };
