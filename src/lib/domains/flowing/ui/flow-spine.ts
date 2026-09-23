import type { FoliateBook } from 'foliate-js/view.js';
import { essenceOf } from './chapter-transform';

type Spine = {
  readonly sections: number;
  readonly withoutABody: readonly number[];
};

type Spined = Pick<FoliateBook, 'sections' | 'resources'>;

const SPINE_ITEM_WITH_NO_BODY = 'image/svg+xml';

const OUT_OF_THE_READING_ORDER = 'no';

function hasNoBody(mediaType: string | null | undefined): boolean {
  if (mediaType === null || mediaType === undefined) return false;

  return essenceOf(mediaType) === SPINE_ITEM_WITH_NO_BODY;
}

function spineOf(book: Spined): Spine {
  const withoutABody: number[] = [];
  book.sections.forEach((section, index) => {
    if (hasNoBody(book.resources.getItemByHref(section.id)?.mediaType)) withoutABody.push(index);
  });

  return { sections: book.sections.length, withoutABody };
}

function leaveOutSectionsWithNoBody(book: Spined, spine: Spine): void {
  book.sections.forEach((section, index) => {
    if (spine.withoutABody.includes(index)) section.linear = OUT_OF_THE_READING_ORDER;
  });
}

function sectionWithABody(spine: Spine, index: number): number | null {
  if (!spine.withoutABody.includes(index)) return index;

  for (let after = index + 1; after < spine.sections; after += 1) {
    if (!spine.withoutABody.includes(after)) return after;
  }
  for (let before = index - 1; before >= 0; before -= 1) {
    if (!spine.withoutABody.includes(before)) return before;
  }

  return null;
}

export {
  hasNoBody,
  leaveOutSectionsWithNoBody,
  OUT_OF_THE_READING_ORDER,
  sectionWithABody,
  spineOf,
  SPINE_ITEM_WITH_NO_BODY,
};
export type { Spine, Spined };
