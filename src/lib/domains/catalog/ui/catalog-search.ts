import { isComposingKey } from '$lib/shared/composing-key';
import type { ComposingSignals } from '$lib/shared/composing-key';
import { match } from 'ts-pattern';
import type { FeedSearch } from '../domain/catalog-feed';
import type { FeedReading } from './catalog-session.svelte';
import type { EntryId, Location, Place } from './navigation';

type HeaderField = {
  readonly placeholder: string;
  readonly disabled: boolean;
  readonly value: string;
  readonly oninput: (value: string) => void;
  readonly onsubmit: (value: string) => void;
};

type SearchAvailability = 'unknown' | 'offered' | 'absent';

function searchAvailability(settled: boolean, offered: FeedSearch | null): SearchAvailability {
  if (offered !== null) return 'offered';
  return settled ? 'absent' : 'unknown';
}

function searchPlaceholder(catalogName: string, availability: SearchAvailability): string {
  return availability === 'absent' ? `${catalogName} has no search` : `Search ${catalogName}`;
}

type SearchFieldKey = 'submit' | 'clear' | 'ignore';

type SearchFieldPress = ComposingSignals & { readonly key: string };

function searchFieldKey(press: SearchFieldPress, value: string): SearchFieldKey {
  if (isComposingKey(press)) return 'ignore';
  if (press.key === 'Enter') return 'submit';
  return press.key === 'Escape' && value.length > 0 ? 'clear' : 'ignore';
}

type SearchMove =
  | { readonly kind: 'ignore' }
  | { readonly kind: 'leave' }
  | { readonly kind: 'search'; readonly search: FeedSearch; readonly query: string };

type SearchDraft = { readonly text: string; readonly entry: EntryId };

type SearchOffer = { readonly settled: boolean; readonly search: FeedSearch | null };

function searchMove(query: string, shown: Location, offered: FeedSearch | null): SearchMove {
  const trimmed = query.trim();
  if (trimmed === '') return shown.kind === 'search' ? { kind: 'leave' } : { kind: 'ignore' };
  if (offered === null) return { kind: 'ignore' };
  if (shown.kind === 'search' && shown.query.trim() === trimmed) return { kind: 'ignore' };
  return { kind: 'search', search: offered, query };
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
  return { settled: here !== undefined, search: own ?? fallback };
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

export {
  fieldValue,
  searchAvailability,
  searchFieldKey,
  searchMove,
  searchOffer,
  searchPlaceholder,
};
export type {
  HeaderField,
  SearchAvailability,
  SearchDraft,
  SearchFieldKey,
  SearchFieldPress,
  SearchMove,
  SearchOffer,
};
