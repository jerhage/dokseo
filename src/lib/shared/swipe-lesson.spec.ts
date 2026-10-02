import { describe, expect, it } from 'vitest';
import { swipeLine } from './swipe-lesson';
import type { SwipeLesson } from './swipe-lesson';

describe('swipeLine', () => {
  it.each<[string, SwipeLesson, string, string]>([
    [
      'a reader whose next page is to the right to swipe left, with a left arrow',
      { kind: 'sideways', forward: 'left' },
      'Swipe left for the next page',
      'left',
    ],
    [
      'a reader whose next page is to the left to swipe right, with a right arrow',
      { kind: 'sideways', forward: 'right' },
      'Swipe right for the next page',
      'right',
    ],
    [
      'a reader of vertical text to swipe up or down, with an up-and-down arrow',
      { kind: 'vertical-pages' },
      'Swipe up or down to turn the page',
      'up-down',
    ],
    [
      'a reader of a strip to swipe up or down to scroll, with an up-and-down arrow',
      { kind: 'vertical-scroll' },
      'Swipe up or down to scroll',
      'up-down',
    ],
  ])('tells %s', (_name, lesson, text, arrow) => {
    expect(swipeLine(lesson)).toEqual({ text, arrow });
  });
});
