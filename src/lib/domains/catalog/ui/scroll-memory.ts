import type { Attachment } from 'svelte/attachments';
import { scrollParent } from './reach-end';

type Scroller = {
  readonly read: () => number;
  readonly scrollTo: (top: number) => void;
};

function scrollMemory(bind: (scroller: Scroller) => () => void): Attachment<HTMLElement> {
  return (element) => {
    const parent = scrollParent(element);
    if (parent === null) return undefined;
    return bind({
      read: () => parent.scrollTop,
      scrollTo: (top) => {
        if (element.getClientRects().length > 0) parent.scrollTop = top;
      },
    });
  };
}

export { scrollMemory };
export type { Scroller };
