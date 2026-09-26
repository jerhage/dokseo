import { match } from 'ts-pattern';
import type { TagId } from '$lib/shared/ids';
import type { Tag } from '../../domain/tag/tag';
import type { TagOption } from '../../domain/tag/tag-match';
import { removalWarning, tagRemoval } from './tag-removal';
import type { TagViewStatus } from './tag-view.svelte';

type ManageRow = {
  readonly id: TagId;
  readonly tag: Tag;
  readonly count: number;
  readonly warning: string;
};

function manageRows(options: readonly TagOption[]): readonly ManageRow[] {
  return options.map((option) => ({
    id: option.tag.id,
    tag: option.tag,
    count: option.count,
    warning: removalWarning(tagRemoval(option.tag.name, option.count)),
  }));
}

function manageNotice(rows: number, status: TagViewStatus): string | null {
  if (rows > 0) return null;

  return match(status)
    .with('idle', 'loading', () => 'Reading your tags…')
    .with('ready', 'failed', () => 'No tags yet. Tag a capture in the reader and it appears here.')
    .exhaustive();
}

function captureCount(count: number): string {
  return `${count} ${count === 1 ? 'capture' : 'captures'}`;
}

export { captureCount, manageNotice, manageRows };
export type { ManageRow };
