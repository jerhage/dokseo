import type { TagId } from '$lib/shared/ids';
import type { ReadState } from '$lib/shared/read-state';
import type { Capture, UnreadableCapture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';
import type { TagCounting } from './capture-panel.svelte';

type CaptureFind = ReadState<readonly Capture[]>;

type CaptureFindRead = {
  readonly state: CaptureFind;
  readonly captures: readonly Capture[];
  readonly tags: readonly Tag[];
  readonly tagCounts: ReadonlyMap<TagId, number>;
  readonly unreadable: readonly UnreadableCapture[];
  reload(): void;
};

const NO_CAPTURES: readonly Capture[] = [];

const NO_TAGS: readonly Tag[] = [];

const NO_COUNTS: ReadonlyMap<TagId, number> = new Map();

function foundCaptures(find: CaptureFind): readonly Capture[] {
  return find.kind === 'ready' ? find.value : NO_CAPTURES;
}

function foundTags(tags: ReadState<readonly Tag[]>): readonly Tag[] {
  return tags.kind === 'ready' ? tags.value : NO_TAGS;
}

function tagCountingOf(read: () => CaptureFindRead | null | undefined): TagCounting {
  return {
    counts: () => read()?.tagCounts ?? NO_COUNTS,
    ask: () => read()?.reload(),
  };
}

export { foundCaptures, foundTags, tagCountingOf };
export type { CaptureFind, CaptureFindRead };
