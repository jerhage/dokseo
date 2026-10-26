import type { Change } from './change';

const MAX_BATCH_CHANGES = 500;

const MAX_BATCH_BYTES = 900 * 1024;

const EMPTY_BODY_BYTES = new TextEncoder().encode(JSON.stringify({ changes: [] })).length;

const SEPARATOR_BYTES = 1;

type Sized = { readonly bytes: number };

function changeBytes(change: Change): number {
  return new TextEncoder().encode(JSON.stringify(change)).length;
}

function batchesOf<T extends Sized>(entries: readonly T[]): readonly (readonly T[])[] {
  const batches: T[][] = [];
  let current: T[] = [];
  let bytes = EMPTY_BODY_BYTES;

  for (const entry of entries) {
    const added = entry.bytes + (current.length === 0 ? 0 : SEPARATOR_BYTES);
    const full = current.length >= MAX_BATCH_CHANGES || bytes + added > MAX_BATCH_BYTES;
    if (current.length > 0 && full) {
      batches.push(current);
      current = [];
      bytes = EMPTY_BODY_BYTES;
    }
    bytes += entry.bytes + (current.length === 0 ? 0 : SEPARATOR_BYTES);
    current.push(entry);
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export { MAX_BATCH_BYTES, MAX_BATCH_CHANGES, batchesOf, changeBytes };
