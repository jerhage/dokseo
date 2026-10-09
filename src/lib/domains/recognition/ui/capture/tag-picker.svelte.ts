import type { CaptureId, TagId } from '$lib/shared/ids';
import { movedCursor } from './tag-picker-rules';

function createTagPicker() {
  let capture = $state.raw<CaptureId | null>(null);
  let carried = $state.raw<readonly TagId[]>([]);
  let query = $state('');
  let cursor = $state(0);

  return {
    get capture(): CaptureId | null {
      return capture;
    },
    get carried(): readonly TagId[] {
      return carried;
    },
    get query(): string {
      return query;
    },
    get cursor(): number {
      return cursor;
    },
    setQuery(typed: string): void {
      query = typed;
      cursor = 0;
    },
    open(opened: CaptureId, onIt: readonly TagId[]): void {
      capture = opened;
      carried = onIt;
      query = '';
      cursor = 0;
    },
    close(): void {
      capture = null;
      carried = [];
      query = '';
      cursor = 0;
    },
    moveBy(step: number, rowCount: number): void {
      cursor = movedCursor(cursor, step, rowCount);
    },
  };
}

type TagPickerHook = ReturnType<typeof createTagPicker>;

export { createTagPicker };
export type { TagPickerHook };
