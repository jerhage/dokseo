import { DEVICE_TAB } from './library-tabs';

type LibraryHistoryState = {
  readonly tab: string;
  readonly feed: number;
  readonly detail: string | null;
  readonly entry: string;
};

type HistoryMode = 'push' | 'replace';

type HistoryPort = {
  readonly push: (state: LibraryHistoryState) => void;
  readonly replace: (state: LibraryHistoryState) => void;
  readonly back: () => void;
  readonly go: (delta: number) => void;
};

type HistoryRecorder = {
  readonly moved: (tab: string, mode: HistoryMode) => void;
  readonly detailOpened: (tab: string, detail: string) => void;
  readonly detailClosed: () => void;
  readonly walkedBack: (tab: string, feed: number) => boolean;
};

type HistoryTargets = {
  readonly selected: () => string;
  readonly feedIndex: (tab: string) => number;
  readonly restoreTab: (tab: string) => void;
  readonly restoreFeed: (tab: string, feed: number) => void;
  readonly restoreDetail: (tab: string, detail: string | null) => void;
};

const NO_HISTORY: HistoryRecorder = {
  moved: () => undefined,
  detailOpened: () => undefined,
  detailClosed: () => undefined,
  walkedBack: () => false,
};

function sameState(a: LibraryHistoryState, b: LibraryHistoryState): boolean {
  return a.tab === b.tab && a.feed === b.feed && a.detail === b.detail;
}

class LibraryHistory implements HistoryRecorder {
  #port: HistoryPort;
  #targets: HistoryTargets;
  #current: LibraryHistoryState | null = null;
  #stack: LibraryHistoryState[] = [];
  #at = -1;

  constructor(port: HistoryPort, targets: HistoryTargets) {
    this.#port = port;
    this.#targets = targets;
  }

  arrive(): void {
    const tab = this.#targets.selected();
    const state = {
      tab,
      feed: this.#targets.feedIndex(tab),
      detail: null,
      entry: crypto.randomUUID(),
    };
    this.#current = state;
    this.#stack = [state];
    this.#at = 0;
    this.#port.replace(state);
  }

  moved(tab: string, mode: HistoryMode): void {
    if (this.#current === null) return;
    const entry = mode === 'replace' ? this.#entryHere() : crypto.randomUUID();
    const state = { tab, feed: this.#targets.feedIndex(tab), detail: null, entry };
    if (mode === 'replace' && sameState(state, this.#current)) return;
    this.#current = state;
    if (mode === 'push') this.#pushed(state);
    else this.#replaced(state);
  }

  detailOpened(tab: string, detail: string): void {
    if (this.#current === null) return;
    const state = {
      tab,
      feed: this.#targets.feedIndex(tab),
      detail,
      entry: crypto.randomUUID(),
    };
    this.#current = state;
    this.#pushed(state);
  }

  detailClosed(): void {
    const current = this.#current;
    if (current === null || current.detail === null) return;
    this.#current = { ...current, detail: null };
    this.#port.back();
  }

  walkedBack(tab: string, feed: number): boolean {
    const here = this.#stack[this.#at];
    if (here === undefined || here.tab !== tab || here.detail !== null) return false;
    const steps = here.feed - feed;
    if (steps < 1) return false;
    for (let step = 1; step <= steps; step += 1) {
      const earlier = this.#stack[this.#at - step];
      const own = earlier?.tab === tab && earlier.detail === null;
      if (!own || earlier.feed !== here.feed - step) return false;
    }
    this.#port.go(-steps);
    return true;
  }

  observe(state: LibraryHistoryState | undefined): void {
    if (this.#current === null || state === undefined) return;
    this.#at = this.#stack.findIndex(({ entry }) => entry === state.entry);
    if (sameState(state, this.#current)) return;
    this.#current = state;
    this.#targets.restoreTab(state.tab);
    if (state.tab !== DEVICE_TAB && this.#targets.feedIndex(state.tab) !== state.feed) {
      this.#targets.restoreFeed(state.tab, state.feed);
    }
    this.#targets.restoreDetail(state.tab, state.detail);
  }

  #entryHere(): string {
    return this.#stack[this.#at]?.entry ?? crypto.randomUUID();
  }

  #pushed(state: LibraryHistoryState): void {
    this.#stack = [...this.#stack.slice(0, this.#at + 1), state];
    this.#at = this.#stack.length - 1;
    this.#port.push(state);
  }

  #replaced(state: LibraryHistoryState): void {
    if (this.#at >= 0) this.#stack[this.#at] = state;
    this.#port.replace(state);
  }
}

export { LibraryHistory, NO_HISTORY };
export type { HistoryMode, HistoryPort, HistoryRecorder, HistoryTargets, LibraryHistoryState };
