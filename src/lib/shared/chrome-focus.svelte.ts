import { chromeHolds } from './reader-chrome';
import type { ChromeBar } from './reader-chrome';

type ChromeBars = () => readonly (ChromeBar | null)[];

type FocusedNodes = () => readonly (Element | null)[];

type Defer = (read: () => void) => void;

const NEXT_MICROTASK: Defer = (read) => queueMicrotask(read);

class ChromeFocus {
  #bars: ChromeBars;
  #focused: FocusedNodes;
  #defer: Defer;
  #held = $state(false);
  #due = false;

  constructor(bars: ChromeBars, focused: FocusedNodes, defer: Defer = NEXT_MICROTASK) {
    this.#bars = bars;
    this.#focused = focused;
    this.#defer = defer;
  }

  get held(): boolean {
    return this.#held;
  }

  refresh(): void {
    if (this.#due) return;
    this.#due = true;

    this.#defer(() => {
      this.#due = false;
      this.#held = chromeHolds(this.#bars(), this.#focused());
    });
  }
}

export { ChromeFocus };
export type { ChromeBars, Defer, FocusedNodes };
