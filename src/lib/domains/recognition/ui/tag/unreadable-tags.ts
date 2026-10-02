import { match } from 'ts-pattern';
import type { WriteState } from '$lib/shared/write-state';
import type { UnreadableTag } from '../../domain/tag/tag';
import type { RemoveUnreadableTagsResult } from '../../use-cases/tag/remove-unreadable-tags';
import { describeStorageFailure } from '../capture/storage-failure';

const SHORT_ID_LENGTH = 8;

function unreadableTagsTitle(count: number): string {
  return count === 1 ? '1 tag could not be read' : `${count} tags could not be read`;
}

function unreadableTagName(tag: UnreadableTag): string {
  if (tag.name !== null && tag.name.trim().length > 0) return tag.name;
  return `Unnamed tag (${tag.id.slice(0, SHORT_ID_LENGTH)})`;
}

function tagRemovalProblem(state: WriteState<RemoveUnreadableTagsResult>): string | null {
  return match(state)
    .with({ kind: 'idle' }, { kind: 'saving' }, () => null)
    .with({ kind: 'failed' }, ({ message }) => message)
    .with({ kind: 'done', result: { kind: 'success' } }, () => null)
    .with({ kind: 'done', result: { kind: 'storage-unavailable' } }, ({ result }) =>
      describeStorageFailure(result),
    )
    .exhaustive();
}

export { tagRemovalProblem, unreadableTagName, unreadableTagsTitle };
