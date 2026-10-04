import {
  CorruptRow,
  isStoredFields,
  isStoredList,
  isText,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import { parsedBookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import type { SourceKind } from './book';

type IntrinsicSourceKind = Extract<SourceKind, 'pdf' | 'epub'>;

type PageOrder =
  | { readonly kind: 'intrinsic' }
  | { readonly kind: 'listed'; readonly names: readonly string[] };

type PageList =
  | { readonly kind: 'listed'; readonly names: readonly string[] }
  | { readonly kind: 'unlisted' }
  | { readonly kind: 'unreadable'; readonly cause: string };

type StoredPageList = {
  readonly id: BookId;
  readonly names: readonly string[];
};

const INTRINSIC_ORDER: PageOrder = { kind: 'intrinsic' };

const UNLISTED: PageList = { kind: 'unlisted' };

function isPageName(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

function isPageNames(value: unknown): value is readonly string[] {
  return isStoredList(value) && value.every(isPageName);
}

function isFlatBookId(value: unknown): value is string {
  return isText(value) && parsedBookId(value) !== null;
}

function storedNames(record: unknown): readonly string[] {
  const row = knownStoredValue('page list', 'row', record, isStoredFields);
  knownStoredValue('page list', 'book id', row.id, isFlatBookId);
  return knownStoredValue('page list', 'page names', row.names, isPageNames);
}

function pageListFromStored(record: unknown): PageList {
  if (record === undefined) return UNLISTED;
  try {
    const names = storedNames(record);
    return { kind: 'listed', names };
  } catch (error) {
    if (!(error instanceof CorruptRow)) throw error;
    return { kind: 'unreadable', cause: error.message };
  }
}

export { INTRINSIC_ORDER, UNLISTED, pageListFromStored };
export type { IntrinsicSourceKind, PageList, PageOrder, StoredPageList };
