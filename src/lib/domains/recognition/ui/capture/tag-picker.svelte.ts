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

function lastRow(rows: readonly PickerRow[]): number {
  return Math.max(rows.length - 1, 0);
}

class TagPicker {
  #source: () => PickerTags;
  #capture = $state.raw<CaptureId | null>(null);
  #carried = $state.raw<readonly TagId[]>([]);
  #query = $state('');
  #cursor = $state(0);

  constructor(source: () => PickerTags) {
    this.#source = source;
  }

  get capture(): CaptureId | null {
    return this.#capture;
  }

  get carried(): readonly TagId[] {
    return this.#carried;
  }

  get query(): string {
    return this.#query;
  }

  set query(typed: string) {
    this.#query = typed;
    this.#cursor = 0;
  }

  get rows(): readonly PickerRow[] {
    if (this.#capture === null) return [];

    const held = this.#source();
    return pickerRows(tagMatches(held.tags, held.counts, this.#carried, this.#query));
  }

  get highlighted(): number {
    return Math.min(this.#cursor, lastRow(this.rows));
  }

  get chosen(): PickerRow | null {
    return this.rows[this.highlighted] ?? null;
  }

  open(capture: CaptureId, carried: readonly TagId[]): void {
    this.#capture = capture;
    this.#carried = carried;
    this.#query = '';
    this.#cursor = 0;
  }

  close(): void {
    this.#capture = null;
    this.#carried = [];
    this.#query = '';
    this.#cursor = 0;
  }

  moveBy(step: number): void {
    this.#cursor = Math.min(Math.max(this.highlighted + step, 0), lastRow(this.rows));
  }
}

export { pickerRows, TagPicker };
export type { PickerRow, PickerTags };
