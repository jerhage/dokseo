import type { TocItem } from 'foliate-js/view.js';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { currentEntryKey, flowContents, NO_CONTENTS } from './flow-contents';
import type { ContentsEntry, FlowContents } from './flow-contents';
import type { FlowRelocation } from './flow-move';
import {
  chapterTicks,
  flowLocation,
  flowProgress,
  NO_CHAPTER_TICKS,
  scrubbedFraction,
} from './flow-progress';
import type { FlowLocation, FlowProgress } from './flow-progress';
import type { FlowSurface } from './flow-surface';
import { moveForTurn, turnPage } from './flow-turn';
import type { FlowTurn } from './flow-turn';
import { LEFT_TO_RIGHT_PAGES } from './flow-writing-mode';
import type { BookPaging } from './flow-writing-mode';

const BEFORE_THE_BOOK_SAYS: ReadingDirection = 'ltr';

class FlowNavigation {
  location = $state.raw<FlowLocation | null>(null);
  contents = $state.raw<FlowContents>(NO_CONTENTS);
  ticks = $state.raw<readonly number[]>(NO_CHAPTER_TICKS);
  direction = $state.raw<ReadingDirection>(BEFORE_THE_BOOK_SAYS);
  paging = $state.raw<BookPaging>(LEFT_TO_RIGHT_PAGES);
  reported = $state.raw<TocItem | null>(null);

  #surface: () => FlowSurface | null;

  constructor(surface: () => FlowSurface | null) {
    this.#surface = surface;
  }

  get progress(): FlowProgress {
    return flowProgress(this.location);
  }

  get chapter(): string | null {
    return this.location?.chapter ?? null;
  }

  get currentKey(): string | null {
    return currentEntryKey(this.contents, this.reported);
  }

  learn(surface: FlowSurface): void {
    this.contents = flowContents(surface.toc);
    this.ticks = chapterTicks(surface.ticks);
    this.direction = surface.direction;
    this.paging = surface.paging;
  }

  moved(relocation: FlowRelocation): FlowLocation {
    const here = flowLocation(relocation);
    this.location = here;
    this.reported = relocation.tocItem ?? null;
    return here;
  }

  reset(): void {
    this.location = null;
    this.contents = NO_CONTENTS;
    this.ticks = NO_CHAPTER_TICKS;
    this.direction = BEFORE_THE_BOOK_SAYS;
    this.paging = LEFT_TO_RIGHT_PAGES;
    this.reported = null;
  }

  turn(turn: FlowTurn): void {
    const surface = this.#surface();
    if (surface === null) return;

    turnPage(surface.pages, moveForTurn(turn));
  }

  jumpTo(entry: ContentsEntry): void {
    if (entry.kind === 'heading') return;

    this.#surface()?.jump(entry.href);
  }

  seek(asked: number): void {
    const target = scrubbedFraction(this.progress, asked);
    if (target === null) return;

    this.#surface()?.seek(target);
  }
}

export { FlowNavigation };
