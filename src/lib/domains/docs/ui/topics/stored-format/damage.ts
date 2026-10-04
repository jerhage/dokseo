import { match } from 'ts-pattern';
import { pageListFromStored } from '$lib/domains/library/domain/book/page-list';
import {
  removedBookFromStored,
  removedBooksFromStored,
  unreadableRemovedBooksFrom,
} from '$lib/domains/library/domain/book/removed-book';
import { bookFromStored, booksFromStored } from '$lib/domains/library/domain/book/stored-book';
import {
  captureFromStored,
  capturesFromStored,
} from '$lib/domains/recognition/domain/capture/capture';
import { tagFromStored, tagsFromStored } from '$lib/domains/recognition/domain/tag/tag';
import { CorruptRow, isStoredFields, isText } from '$lib/shared/corrupt-row';
import { RECORD_FORMATS, leavesOf } from './field-notes';
import type { RecordKind, StoredRow } from './field-notes';

type Damage = 'remove' | 'null' | 'empty-text' | 'text' | 'negative' | 'over-one' | 'not-finite';

type DamageOption = { readonly damage: Damage; readonly label: string };

type Fixture = {
  readonly id: string;
  readonly label: string;
  readonly kind: RecordKind;
  readonly row: StoredRow;
};

type DamagedRead =
  | { readonly kind: 'read'; readonly unchanged: boolean }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly apart: boolean };

type DamageSummary = {
  readonly variant: 'success' | 'warning';
  readonly title: string;
  readonly text: string;
};

const ABSENT = 'absent';

const DAMAGE_OPTIONS: readonly DamageOption[] = [
  { damage: 'remove', label: 'Remove it' },
  { damage: 'null', label: 'null' },
  { damage: 'empty-text', label: '""' },
  { damage: 'text', label: '"x"' },
  { damage: 'negative', label: '-1' },
  { damage: 'over-one', label: '1.5' },
  { damage: 'not-finite', label: 'NaN' },
];

const KIND_LABELS: Readonly<Record<RecordKind, string>> = {
  book: 'Book',
  'page-list': 'Page list',
  'removed-book': 'Removed book',
  capture: 'Capture',
  tag: 'Tag',
};

const FIXTURES: readonly Fixture[] = RECORD_FORMATS.flatMap((format) =>
  format.variants.map((variant) => ({
    id: `${format.kind}:${variant.name}`,
    label: `${KIND_LABELS[format.kind]}: ${variant.name}`,
    kind: format.kind,
    row: variant.row,
  })),
);

function fixtureById(id: string): Fixture {
  const fixture = FIXTURES.find((candidate) => candidate.id === id);
  if (fixture === undefined) throw new Error(`No stored fixture is named ${id}`);
  return fixture;
}

function fieldsOf(fixture: Fixture): readonly string[] {
  return [...new Set(leavesOf(fixture.row).map((leaf) => leaf.path))];
}

function damagedValue(damage: Exclude<Damage, 'remove'>): unknown {
  return match(damage)
    .with('null', () => null)
    .with('empty-text', () => '')
    .with('text', () => 'x')
    .with('negative', () => -1)
    .with('over-one', () => 1.5)
    .with('not-finite', () => Number.NaN)
    .exhaustive();
}

function steps(path: string): readonly string[] {
  return path
    .split('.')
    .flatMap((step) => (step.endsWith('[]') ? [step.slice(0, -2), '0'] : [step]));
}

function damagedRow(row: StoredRow, path: string, damage: Damage): StoredRow {
  const copy: StoredRow = structuredClone(row);
  const route = steps(path);
  const last = route.at(-1);
  let holder: unknown = copy;
  for (const step of route.slice(0, -1)) {
    holder = isStoredFields(holder) ? Reflect.get(holder, step) : undefined;
  }
  if (last === undefined || !isStoredFields(holder)) return copy;
  if (damage === 'remove') Reflect.deleteProperty(holder, last);
  else Reflect.set(holder, last, damagedValue(damage));
  return copy;
}

function valueAt(row: StoredRow, path: string): unknown {
  let holder: unknown = row;
  for (const step of steps(path)) {
    if (!isStoredFields(holder) || !Object.hasOwn(holder, step)) return undefined;
    holder = Reflect.get(holder, step);
  }
  return holder;
}

function shownValue(value: unknown): string {
  if (value === undefined) return ABSENT;
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  return JSON.stringify(value);
}

function readRecord(kind: RecordKind, row: StoredRow): unknown {
  return match(kind)
    .with('book', () => bookFromStored(row))
    .with('removed-book', () => removedBookFromStored(row))
    .with('capture', () => captureFromStored(row))
    .with('tag', () => tagFromStored(row))
    .with('page-list', () => pageListFromStored(row))
    .exhaustive();
}

function unreadableCause(kind: RecordKind, row: StoredRow): string | null {
  try {
    const record = readRecord(kind, row);
    return isStoredFields(record) && record.kind === 'unreadable' && isText(record.cause)
      ? record.cause
      : null;
  } catch (cause) {
    if (!(cause instanceof CorruptRow)) throw cause;
    return cause.message;
  }
}

function listedApart(kind: RecordKind, row: StoredRow): boolean {
  try {
    return match(kind)
      .with('book', () => booksFromStored([row]).unreadable.length > 0)
      .with('capture', () => capturesFromStored([row]).unreadable.length > 0)
      .with('tag', () => tagsFromStored([row]).unreadable.length > 0)
      .with(
        'removed-book',
        () => unreadableRemovedBooksFrom(removedBooksFromStored([row]).unreadable).length > 0,
      )
      .with('page-list', () => true)
      .exhaustive();
  } catch (cause) {
    if (!(cause instanceof CorruptRow)) throw cause;
    return false;
  }
}

function readDamaged(fixture: Fixture, row: StoredRow): DamagedRead {
  const reason = unreadableCause(fixture.kind, row);
  if (reason !== null) {
    return { kind: 'unreadable', reason, apart: listedApart(fixture.kind, row) };
  }
  const read = JSON.stringify(readRecord(fixture.kind, row));
  const original = JSON.stringify(readRecord(fixture.kind, fixture.row));
  return { kind: 'read', unchanged: read === original };
}

function wayOut(kind: RecordKind): string {
  return match(kind)
    .with(
      'book',
      () =>
        'The shelf lists it under “1 book could not be read”, with Remove, and Merge when a readable book matches. Uploading the same file again repairs it.',
    )
    .with(
      'removed-book',
      () =>
        'Removed books lists it with “Could not be read. Upload the same file again to restore it with its captures”.',
    )
    .with(
      'page-list',
      () =>
        'The book row still reads, but opening the book fails with this cause, and the archive is not listed again over it.',
    )
    .with(
      'capture',
      () =>
        '“1 capture could not be read” appears with Export these first and Remove 1 unreadable capture.',
    )
    .with(
      'tag',
      () => '“1 tag could not be read” appears with Export these first and a Remove button.',
    )
    .exhaustive();
}

function noWayOut(kind: RecordKind): string {
  return match(kind)
    .with(
      'book',
      () =>
        'With no usable id the row cannot be listed on its own, so reading the shelf fails as a whole: “Your library could not be read.”',
    )
    .with(
      'capture',
      () =>
        'With no usable id the row cannot be listed on its own, so reading the captures fails as a whole: “Your captures could not be read.”',
    )
    .with(
      'tag',
      () =>
        'With no usable id the row cannot be listed on its own, so reading the tags fails as a whole: “Your tags could not be read.”',
    )
    .with('removed-book', () => 'Removed books leaves out a record with no usable id.')
    .with('page-list', () => wayOut('page-list'))
    .exhaustive();
}

function damageSummary(fixture: Fixture, read: DamagedRead): DamageSummary {
  return match(read)
    .with({ kind: 'unreadable', apart: true }, ({ reason }): DamageSummary => ({
      variant: 'warning',
      title: 'Unreadable',
      text: `${reason}. ${wayOut(fixture.kind)}`,
    }))
    .with({ kind: 'unreadable', apart: false }, ({ reason }): DamageSummary => ({
      variant: 'warning',
      title: 'Unreadable, with no usable id',
      text: `${reason}. ${noWayOut(fixture.kind)}`,
    }))
    .with({ kind: 'read', unchanged: true }, (): DamageSummary => ({
      variant: 'success',
      title: 'Read, unchanged',
      text: 'The mapper returns the same record as for the undamaged fixture.',
    }))
    .with({ kind: 'read', unchanged: false }, (): DamageSummary => ({
      variant: 'success',
      title: 'Read, with the new value',
      text: 'The new value passes the field’s check, so the record holds it.',
    }))
    .exhaustive();
}

export {
  DAMAGE_OPTIONS,
  FIXTURES,
  damageSummary,
  damagedRow,
  fieldsOf,
  fixtureById,
  readDamaged,
  shownValue,
  valueAt,
};
export type { Damage, DamageOption, DamageSummary, DamagedRead, Fixture };
