import type { BookId } from '$lib/shared/ids';
import type { SourceKind } from './book';

type IntrinsicSourceKind = Extract<SourceKind, 'pdf' | 'epub'>;

type PageOrder =
  | { readonly kind: 'intrinsic' }
  | { readonly kind: 'listed'; readonly names: readonly string[] };

type PageList =
  | { readonly kind: 'listed'; readonly names: readonly string[] }
  | { readonly kind: 'unlisted' };

type StoredPageList = {
  readonly id: BookId;
  readonly names: readonly string[];
};

const INTRINSIC_ORDER: PageOrder = { kind: 'intrinsic' };

const UNLISTED: PageList = { kind: 'unlisted' };

function pageListFromStored(record: StoredPageList | undefined): PageList {
  if (record === undefined) return UNLISTED;
  return { kind: 'listed', names: record.names };
}

export { INTRINSIC_ORDER, UNLISTED, pageListFromStored };
export type { IntrinsicSourceKind, PageList, PageOrder, StoredPageList };
