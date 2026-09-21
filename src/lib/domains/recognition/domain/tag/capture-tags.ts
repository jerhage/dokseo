import type { TagId } from '$lib/shared/ids';
import type { Capture } from '../capture/capture';

function tagCounts(captures: readonly Capture[]): ReadonlyMap<TagId, number> {
  const counts = new Map<TagId, number>();

  for (const capture of captures) {
    for (const tag of capture.tagIds) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return counts;
}

function taggedCapture(capture: Capture, tag: TagId): Capture {
  if (capture.tagIds.includes(tag)) return capture;

  return { ...capture, tagIds: [...capture.tagIds, tag] };
}

function untaggedCapture(capture: Capture, tag: TagId): Capture {
  return { ...capture, tagIds: capture.tagIds.filter((held) => held !== tag) };
}

export { tagCounts, taggedCapture, untaggedCapture };
