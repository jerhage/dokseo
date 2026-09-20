import type { ImageIndex } from '$lib/shared/ids';
import { groupContaining } from './page-pairing';
import type { PageGroup } from './page-pairing';

type ReadingPosition = { readonly index: ImageIndex; readonly offset: number };

function clampOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.min(1, Math.max(0, offset));
}

function readingPosition(index: ImageIndex, offset: number): ReadingPosition {
  return { index, offset: clampOffset(offset) };
}

function groupOf(groups: readonly PageGroup[], position: ReadingPosition): number {
  return groupContaining(groups, position.index);
}

function positionOfGroup(groups: readonly PageGroup[], group: number): ReadingPosition | null {
  const first = groups[group]?.[0];
  if (first === undefined) return null;
  return readingPosition(first, 0);
}

export { readingPosition, groupOf, positionOfGroup };
export type { ReadingPosition };
