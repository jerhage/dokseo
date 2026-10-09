import { imageIndex } from '$lib/shared/ids';
import { readingPosition } from '../domain/reading-position';
import type { ReadingPosition } from '../domain/reading-position';

const AT_THE_FIRST_IMAGE: ReadingPosition = readingPosition(imageIndex(0), 0);

function createPagePosition() {
  let position = $state.raw<ReadingPosition>(AT_THE_FIRST_IMAGE);

  return {
    get position(): ReadingPosition {
      return position;
    },
    set(next: ReadingPosition): void {
      position = next;
    },
  };
}

type PagePositionHook = ReturnType<typeof createPagePosition>;

export { AT_THE_FIRST_IMAGE, createPagePosition };
export type { PagePositionHook };
