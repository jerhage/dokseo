import { match } from 'ts-pattern';
import { applyEdit } from '$lib/domains/library/domain/book/book';
import type { Book, BookEdit } from '$lib/domains/library/domain/book/book';
import { bookFromStored, savedBookRow } from '$lib/domains/library/domain/book/stored-book';
import { describeCause } from '$lib/shared/cause';
import { isStoredFields } from '$lib/shared/corrupt-row';
import type { StoredFields } from '$lib/shared/corrupt-row';
import { STORED_ROW } from '../storage/row-check';

type FieldChange = {
  readonly field: string;
  readonly stored: string;
  readonly written: string;
};

type RowSave =
  | { readonly kind: 'not-json'; readonly reason: string }
  | { readonly kind: 'not-a-row' }
  | { readonly kind: 'unreadable'; readonly reason: string }
  | {
      readonly kind: 'saved';
      readonly written: StoredFields;
      readonly kept: readonly string[];
      readonly rewritten: readonly FieldChange[];
    };

type SaveSummary = {
  readonly variant: 'success' | 'warning' | 'danger';
  readonly title: string;
  readonly text: string;
};

const SAVE_TIME = 1_759_500_000_000;

const SAVE_EDIT: BookEdit = { lastReadAt: SAVE_TIME };

const NEWER_FIELD = 'fieldFromANewerVersion';

const SAMPLE_ROW_TEXT = JSON.stringify({ ...STORED_ROW, [NEWER_FIELD]: 'kept as stored' }, null, 2);

function shownValue(value: unknown): string {
  return value === undefined ? 'absent' : JSON.stringify(value);
}

function rewrittenFields(stored: StoredFields, book: Book): readonly FieldChange[] {
  return Object.entries(book).flatMap(([field, value]) => {
    if (field in SAVE_EDIT) return [];
    const before = shownValue(stored[field]);
    const after = shownValue(value);
    return before === after ? [] : [{ field, stored: before, written: after }];
  });
}

function savedRow(text: string): RowSave {
  let stored: unknown;
  try {
    stored = JSON.parse(text);
  } catch (cause) {
    return { kind: 'not-json', reason: describeCause(cause) };
  }
  if (!isStoredFields(stored) || Array.isArray(stored)) return { kind: 'not-a-row' };

  let book: Book;
  try {
    book = applyEdit(bookFromStored(stored), SAVE_EDIT);
  } catch (cause) {
    return { kind: 'unreadable', reason: describeCause(cause) };
  }

  const written = savedBookRow(stored, book);
  const kept = Object.keys(stored).filter((field) => !(field in book));
  return { kind: 'saved', written, kept, rewritten: rewrittenFields(stored, book) };
}

function saveSummary(save: RowSave): SaveSummary {
  return match(save)
    .with({ kind: 'not-json' }, ({ reason }): SaveSummary => ({
      variant: 'danger',
      title: 'Not JSON',
      text: `${reason}. A row in IndexedDB is a structured clone, never text; this check only guards the editor.`,
    }))
    .with({ kind: 'not-a-row' }, (): SaveSummary => ({
      variant: 'danger',
      title: 'Not an object',
      text: 'A book row is an object. Nothing is written.',
    }))
    .with({ kind: 'unreadable' }, ({ reason }): SaveSummary => ({
      variant: 'warning',
      title: 'Unreadable, nothing written',
      text: `${reason}. bookFromStored throws, so the save stops before it writes anything.`,
    }))
    .with({ kind: 'saved' }, ({ kept }): SaveSummary => ({
      variant: 'success',
      title: 'Saved',
      text:
        kept.length === 0
          ? 'Every field in the row is one the app names, so the whole row is written from the checked book.'
          : 'The checked fields are written over the stored row. The fields the app does not name stay as stored.',
    }))
    .exhaustive();
}

export { NEWER_FIELD, SAMPLE_ROW_TEXT, SAVE_TIME, saveSummary, savedRow };
export type { FieldChange, RowSave, SaveSummary };
