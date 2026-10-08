import type { Attachment } from 'svelte/attachments';

const NEAR_END_MARGIN = '0px 0px 600px 0px';

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
  }
  return null;
}

function reachEnd(onreach: () => void): Attachment<HTMLElement> {
  return (element) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onreach();
      },
      { root: scrollParent(element), rootMargin: NEAR_END_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  };
}

export { NEAR_END_MARGIN, reachEnd, scrollParent };
