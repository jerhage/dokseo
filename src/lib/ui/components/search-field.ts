type SearchFieldType = 'search' | 'text';

const CLEAR_LABEL = 'Clear the search';

function showsClear(clearable: boolean, value: string): boolean {
  return clearable && value !== '';
}

function searchFieldId(given: string | null | undefined, uid: string): string {
  return given ?? `${uid}-search`;
}

export { CLEAR_LABEL, searchFieldId, showsClear };
export type { SearchFieldType };
