import type { Attachment } from 'svelte/attachments';
import { scrollParent } from './reach-end';

type Scroller = {
  readonly read: () => number;
  readonly scrollTo: (top: number) => void;
};

type ScrollRestore = {
  readonly bind: (scroller: Scroller) => () => void;
  readonly track: (top: number) => void;
  readonly settled: () => Promise<void>;
};

function createScrollRestore(
  saved: number,
  keep: (top: number) => void,
  rendered: () => Promise<void>,
): ScrollRestore {
  let scroller: Scroller | null = null;
  let tracking = false;
  let pending = saved;

  return {
    bind: (next) => {
      scroller = next;
      return () => {
        if (scroller === next) scroller = null;
      };
    },
    track: (top) => {
      if (tracking) keep(top);
    },
    settled: async () => {
      if (tracking) return;
      const top = pending;
      pending = 0;
      if (top > 0) {
        await rendered();
        scroller?.scrollTo(top);
      }
      tracking = true;
    },
  };
}

function scrollMemory(restore: Pick<ScrollRestore, 'bind' | 'track'>): Attachment<HTMLElement> {
  return (element) => {
    const parent = scrollParent(element);
    if (parent === null) return undefined;
    const onscroll = () => {
      if (element.getClientRects().length > 0) restore.track(parent.scrollTop);
    };
    parent.addEventListener('scroll', onscroll, { passive: true });
    const unbind = restore.bind({
      read: () => parent.scrollTop,
      scrollTo: (top) => {
        if (element.getClientRects().length > 0) parent.scrollTop = top;
      },
    });
    return () => {
      parent.removeEventListener('scroll', onscroll);
      unbind();
    };
  };
}

export { createScrollRestore, scrollMemory };
export type { ScrollRestore, Scroller };
