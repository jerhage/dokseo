import type { TocItem } from 'foliate-js/view.js';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { flowContents, NO_CONTENTS } from './flow-contents';
import type { FlowContents } from './flow-contents';
import type { FlowRelocation } from './flow-move';
import { chapterTicks, flowLocation, NO_CHAPTER_TICKS } from './flow-progress';
import type { FlowLocation } from './flow-progress';
import type { FlowSurface } from './flow-surface';
import { LEFT_TO_RIGHT_PAGES } from './flow-writing-mode';
import type { BookPaging } from './flow-writing-mode';

const BEFORE_THE_BOOK_SAYS: ReadingDirection = 'ltr';

function createFlowReading() {
  let location = $state.raw<FlowLocation | null>(null);
  let contents = $state.raw<FlowContents>(NO_CONTENTS);
  let ticks = $state.raw<readonly number[]>(NO_CHAPTER_TICKS);
  let direction = $state.raw<ReadingDirection>(BEFORE_THE_BOOK_SAYS);
  let paging = $state.raw<BookPaging>(LEFT_TO_RIGHT_PAGES);
  let reported = $state.raw<TocItem | null>(null);

  return {
    get location(): FlowLocation | null {
      return location;
    },
    get contents(): FlowContents {
      return contents;
    },
    get ticks(): readonly number[] {
      return ticks;
    },
    get direction(): ReadingDirection {
      return direction;
    },
    get paging(): BookPaging {
      return paging;
    },
    get reported(): TocItem | null {
      return reported;
    },
    learn(surface: FlowSurface): void {
      contents = flowContents(surface.toc);
      ticks = chapterTicks(surface.ticks);
      direction = surface.direction;
      paging = surface.paging;
    },
    moved(relocation: FlowRelocation): FlowLocation {
      const here = flowLocation(relocation);
      location = here;
      reported = relocation.tocItem ?? null;
      return here;
    },
    reset(): void {
      location = null;
      contents = NO_CONTENTS;
      ticks = NO_CHAPTER_TICKS;
      direction = BEFORE_THE_BOOK_SAYS;
      paging = LEFT_TO_RIGHT_PAGES;
      reported = null;
    },
  };
}

type FlowReadingHook = ReturnType<typeof createFlowReading>;

export { createFlowReading };
export type { FlowReadingHook };
