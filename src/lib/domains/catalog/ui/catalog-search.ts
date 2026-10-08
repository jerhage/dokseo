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

export { searchAvailability, searchPlaceholder };
export type { HeaderField, SearchAvailability };
