import { chromeHolds } from './reader-chrome';
import type { ChromeBar } from './reader-chrome';

type ChromeBars = () => readonly (ChromeBar | null | undefined)[];

type FocusedNodes = () => readonly (Element | null)[];

type Defer = (read: () => void) => void;

const NEXT_MICROTASK: Defer = (read) => queueMicrotask(read);

function createChromeFocus(bars: ChromeBars, focused: FocusedNodes, defer: Defer = NEXT_MICROTASK) {
  let held = $state(false);
  let due = false;

  return {
    get held(): boolean {
      return held;
    },
    refresh(): void {
      if (due) return;
      due = true;

      defer(() => {
        due = false;
        held = chromeHolds(bars(), focused());
      });
    },
  };
}

export { createChromeFocus };
export type { ChromeBars, Defer, FocusedNodes };
