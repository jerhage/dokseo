import { describe, expect, it } from 'vitest';
import { swipeLine } from './swipe-lesson';

describe('swipeLine', () => {
  it('tells a reader whose next page is to the right to swipe left, with a left arrow', () => {
    expect(swipeLine({ kind: 'sideways', forward: 'left' })).toEqual({
      text: 'Swipe left for the next page',
      arrow: 'left',
    });
  });

  it('tells a reader whose next page is to the left to swipe right, with a right arrow', () => {
    expect(swipeLine({ kind: 'sideways', forward: 'right' })).toEqual({
      text: 'Swipe right for the next page',
      arrow: 'right',
    });
  });

  it('tells a reader of vertical text to swipe up or down, with an up-and-down arrow', () => {
    expect(swipeLine({ kind: 'vertical-pages' })).toEqual({
      text: 'Swipe up or down to turn the page',
      arrow: 'up-down',
    });
  });

  it('tells a reader of a strip to swipe up or down to scroll, with an up-and-down arrow', () => {
    expect(swipeLine({ kind: 'vertical-scroll' })).toEqual({
      text: 'Swipe up or down to scroll',
      arrow: 'up-down',
    });
  });
});
