import { imageIndex } from '$lib/shared/ids';
import type { ImageIndex } from '$lib/shared/ids';
import { groupContaining } from '../domain/page-pairing';
import type { PageGroup } from '../domain/page-pairing';
import { groupOf, readingPosition } from '../domain/reading-position';
import type { ReadingPosition } from '../domain/reading-position';
import { NO_PAGES } from './page-grouping-rules';
import type { PageMove } from './page-moves';
import type { ReaderBook } from './reader-opening';

type ImageTarget =
  | { readonly kind: 'none' }
  | { readonly kind: 'position'; readonly position: ReadingPosition }
  | { readonly kind: 'group'; readonly group: number };

const NO_TARGET: ImageTarget = { kind: 'none' };

function groupIndexOf(groups: readonly PageGroup[], position: ReadingPosition): number {
  const found = groupOf(groups, position);
  return found < 0 ? 0 : found;
}

function visiblePagesOf(groups: readonly PageGroup[], group: number): PageGroup {
  return groups[group] ?? NO_PAGES;
}

function besidePagesOf(
  groups: readonly PageGroup[],
  group: number,
): Readonly<Record<PageMove, PageGroup | null>> {
  return { decrement: groups[group - 1] ?? null, increment: groups[group + 1] ?? null };
}

function imageTarget(
  book: ReaderBook,
  index: ImageIndex,
  groups: readonly PageGroup[],
  position: ReadingPosition,
): ImageTarget {
  if (book.imageCount === 0) return NO_TARGET;

  const wanted = imageIndex(Math.min(Math.max(index, 0), book.imageCount - 1));
  if (wanted === position.index) return NO_TARGET;

  if (book.layoutKind === 'continuous') {
    return { kind: 'position', position: readingPosition(wanted, 0) };
  }

  const group = groupContaining(groups, wanted);
  return group >= 0 ? { kind: 'group', group } : NO_TARGET;
}

export { besidePagesOf, groupIndexOf, imageTarget, visiblePagesOf };
export type { ImageTarget };
