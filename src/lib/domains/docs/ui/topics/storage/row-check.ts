import { bookFromStored, booksFromStored } from '$lib/domains/library/domain/book/stored-book';
import type { StoredBook, UnreadableBook } from '$lib/domains/library/domain/book/stored-book';
import type { Book } from '$lib/domains/library/domain/book/book';
import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';

type RowDamage =
  | 'none'
  | 'language-unknown'
  | 'direction-missing'
  | 'layout-unknown'
  | 'title-missing'
  | 'position-unknown'
  | 'id-unsafe';

type RowCheck =
  | { readonly kind: 'read'; readonly book: Book }
  | { readonly kind: 'set-aside'; readonly unreadable: UnreadableBook; readonly reason: string }
  | { readonly kind: 'listing-fails'; readonly reason: string };

type DamageOption = { readonly damage: RowDamage; readonly label: string };

const STORED_ROW: StoredBook = {
  id: 'b7f3c2a0-5d1e-4c8a-9f2b-1e6d3a4c5b70',
  title: 'Harbor Lights, Volume 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'auto',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: '5f2a9c41e07b3d86a1c4f0e9b2d7a361',
  fileName: 'harbor-lights-01.cbz',
  imageCount: 214,
  addedAt: 1_759_400_000_000,
  position: { kind: 'image', index: 12, shownThrough: 13, offset: 0 },
  lastReadAt: 1_759_480_000_000,
  finishedAt: null,
};

const DAMAGE_OPTIONS: readonly DamageOption[] = [
  { damage: 'none', label: 'As stored' },
  { damage: 'language-unknown', label: "language: 'fr'" },
  { damage: 'direction-missing', label: 'direction missing' },
  { damage: 'layout-unknown', label: "layoutKind: 'scroll'" },
  { damage: 'title-missing', label: 'title missing' },
  { damage: 'position-unknown', label: "position.kind: 'page'" },
  { damage: 'id-unsafe', label: "id: '../books'" },
];

function isRowDamage(value: string): value is RowDamage {
  return DAMAGE_OPTIONS.some((option) => option.damage === value);
}

function withoutField(row: StoredBook, field: keyof StoredBook): StoredBook {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== field));
}

function damagedRow(row: StoredBook, damage: RowDamage): StoredBook {
  return match(damage)
    .with('none', () => row)
    .with('language-unknown', () => ({ ...row, language: 'fr' }))
    .with('direction-missing', () => withoutField(row, 'direction'))
    .with('layout-unknown', () => ({ ...row, layoutKind: 'scroll' }))
    .with('title-missing', () => withoutField(row, 'title'))
    .with('position-unknown', () => ({ ...row, position: { kind: 'page', page: 13 } }))
    .with('id-unsafe', () => ({ ...row, id: '../books' }))
    .exhaustive();
}

function corruptReason(row: StoredBook): string {
  try {
    bookFromStored(row);
    return '';
  } catch (cause) {
    return describeCause(cause);
  }
}

function checkedRow(row: StoredBook): RowCheck {
  let listed: ReturnType<typeof booksFromStored>;
  try {
    listed = booksFromStored([row]);
  } catch (cause) {
    return { kind: 'listing-fails', reason: describeCause(cause) };
  }

  const [book] = listed.books;
  if (book !== undefined) return { kind: 'read', book };

  const [unreadable] = listed.unreadable;
  if (unreadable === undefined) throw new Error('The stored row was neither read nor set aside');
  return { kind: 'set-aside', unreadable, reason: corruptReason(row) };
}

export { DAMAGE_OPTIONS, STORED_ROW, checkedRow, damagedRow, isRowDamage };
export type { DamageOption, RowCheck, RowDamage };
