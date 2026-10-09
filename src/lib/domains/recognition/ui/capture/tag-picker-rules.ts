import { match } from 'ts-pattern';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Tag } from '../../domain/tag/tag';
import { tagMatches } from '../../domain/tag/tag-match';
import type { TagMatches, TagOption } from '../../domain/tag/tag-match';

type PickerRow =
  | { readonly kind: 'tag'; readonly tag: Tag; readonly count: number }
  | { readonly kind: 'create'; readonly name: string };

type PickerTags = {
  readonly tags: readonly Tag[];
  readonly counts: ReadonlyMap<TagId, number>;
};

function optionRows(options: readonly TagOption[]): readonly PickerRow[] {
  return options.map((option) => ({ kind: 'tag', tag: option.tag, count: option.count }));
}

function pickerRows(matches: TagMatches): readonly PickerRow[] {
  return match(matches)
    .with({ kind: 'every' }, (every) => optionRows(every.options))
    .with({ kind: 'matched' }, (both) => [
      ...optionRows(both.options),
      { kind: 'create', name: both.create } as const,
    ])
    .with({ kind: 'matched-only' }, (only) => optionRows(only.options))
    .with({ kind: 'create-only' }, (fresh) => [{ kind: 'create', name: fresh.create } as const])
    .with({ kind: 'taken' }, () => [])
    .exhaustive();
}

function rowsFor(
  held: PickerTags,
  capture: CaptureId | null,
  carried: readonly TagId[],
  query: string,
): readonly PickerRow[] {
  if (capture === null) return [];

  return pickerRows(tagMatches(held.tags, held.counts, carried, query));
}

function lastRow(rowCount: number): number {
  return Math.max(rowCount - 1, 0);
}

function highlightedRow(cursor: number, rowCount: number): number {
  return Math.min(cursor, lastRow(rowCount));
}

function chosenRow(cursor: number, rows: readonly PickerRow[]): PickerRow | null {
  return rows[highlightedRow(cursor, rows.length)] ?? null;
}

function movedCursor(cursor: number, step: number, rowCount: number): number {
  return Math.min(Math.max(highlightedRow(cursor, rowCount) + step, 0), lastRow(rowCount));
}

export { chosenRow, highlightedRow, movedCursor, pickerRows, rowsFor };
export type { PickerRow, PickerTags };
