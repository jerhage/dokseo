import { match } from 'ts-pattern';
import { readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { Capture, UnreadableCapture } from '../domain/capture/capture';
import type { Tag } from '../domain/tag/tag';
import type { ListCapturesResult } from '../use-cases/capture/list-captures';
import type { ListEveryCaptureResult } from '../use-cases/capture/list-every-capture';
import type { ListTagsResult } from '../use-cases/tag/list-tags';

const STORE_BLOCKED = 'This browser blocks local storage.';

function storedCaptures(
  state: ReadState<ListCapturesResult | ListEveryCaptureResult>,
): ReadState<readonly Capture[]> {
  return match(state)
    .with(
      { kind: 'loading' },
      { kind: 'failed' },
      (unread): ReadState<readonly Capture[]> => unread,
    )
    .with({ kind: 'ready', value: { kind: 'success' } }, ({ value }) => readReady(value.captures))
    .with({ kind: 'ready', value: { kind: 'storage-unavailable' } }, () =>
      readFailed(STORE_BLOCKED),
    )
    .exhaustive();
}

function unreadableCaptures(
  state: ReadState<ListCapturesResult | ListEveryCaptureResult>,
): readonly UnreadableCapture[] {
  return state.kind === 'ready' && state.value.kind === 'success' ? state.value.unreadable : [];
}

function storedTags(state: ReadState<ListTagsResult>): ReadState<readonly Tag[]> {
  return match(state)
    .with({ kind: 'loading' }, { kind: 'failed' }, (unread): ReadState<readonly Tag[]> => unread)
    .with({ kind: 'ready', value: { kind: 'success' } }, ({ value }) => readReady(value.tags))
    .with({ kind: 'ready', value: { kind: 'storage-unavailable' } }, () =>
      readFailed(STORE_BLOCKED),
    )
    .exhaustive();
}

export { STORE_BLOCKED, storedCaptures, storedTags, unreadableCaptures };
