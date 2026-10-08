import { isComposingKey } from '$lib/shared/composing-key';
import type { ComposingSignals } from '$lib/shared/composing-key';

type HeaderField = {
  readonly placeholder: string;
  readonly disabled: boolean;
  readonly value: string;
  readonly oninput: (value: string) => void;
  readonly onsubmit: (value: string) => void;
};

type SearchAvailability = 'unknown' | 'offered' | 'absent';

function searchAvailability(settled: boolean, template: string | null): SearchAvailability {
  if (template !== null) return 'offered';
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

export { searchAvailability, searchFieldKey, searchPlaceholder };
export type { HeaderField, SearchAvailability, SearchFieldKey, SearchFieldPress };
