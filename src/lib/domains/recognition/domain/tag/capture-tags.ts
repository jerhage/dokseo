import { CorruptRow } from '$lib/shared/corrupt-row';
import type { TagId } from '$lib/shared/ids';
import { captureFromStored } from '../capture/capture';
import type { Capture, StoredCapture } from '../capture/capture';

type TaggedRecord = { readonly tagIds: readonly TagId[] };

function tagCounts(records: readonly TaggedRecord[]): ReadonlyMap<TagId, number> {
  const counts = new Map<TagId, number>();

  for (const record of records) {
    for (const tag of record.tagIds) counts.set(tag, (counts.get(tag) ?? 0) + 1);
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

function untaggedRow(row: StoredCapture, tag: TagId): Capture | null {
  try {
    return untaggedCapture(captureFromStored(row), tag);
  } catch (cause) {
    if (!(cause instanceof CorruptRow)) throw cause;
    return null;
  }
}

export { tagCounts, taggedCapture, untaggedCapture, untaggedRow };
export type { TaggedRecord };
