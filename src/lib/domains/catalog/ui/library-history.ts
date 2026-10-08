import { DEVICE_TAB } from './library-tabs';

type LibraryHistoryState = {
  readonly tab: string;
  readonly feed: number;
  readonly detail: string | null;
};

type HistoryMode = 'push' | 'replace';

type HistoryPort = {
  readonly push: (state: LibraryHistoryState) => void;
  readonly replace: (state: LibraryHistoryState) => void;
  readonly back: () => void;
};

type HistoryRecorder = {
  readonly moved: (tab: string, mode: HistoryMode) => void;
  readonly detailOpened: (tab: string, detail: string) => void;
  readonly detailClosed: () => void;
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
};

function sameState(a: LibraryHistoryState, b: LibraryHistoryState): boolean {
  return a.tab === b.tab && a.feed === b.feed && a.detail === b.detail;
}

class LibraryHistory implements HistoryRecorder {
  #port: HistoryPort;
  #targets: HistoryTargets;
  #current: LibraryHistoryState | null = null;

  constructor(port: HistoryPort, targets: HistoryTargets) {
    this.#port = port;
    this.#targets = targets;
  }

  arrive(): void {
    const tab = this.#targets.selected();
    const state = { tab, feed: this.#targets.feedIndex(tab), detail: null };
    this.#current = state;
    this.#port.replace(state);
  }

  moved(tab: string, mode: HistoryMode): void {
    if (this.#current === null) return;
    const state = { tab, feed: this.#targets.feedIndex(tab), detail: null };
    if (mode === 'replace' && sameState(state, this.#current)) return;
    this.#current = state;
    if (mode === 'push') this.#port.push(state);
    else this.#port.replace(state);
  }

  detailOpened(tab: string, detail: string): void {
    if (this.#current === null) return;
    const state = { tab, feed: this.#targets.feedIndex(tab), detail };
    this.#current = state;
    this.#port.push(state);
  }

  detailClosed(): void {
    const current = this.#current;
    if (current === null || current.detail === null) return;
    this.#current = { tab: current.tab, feed: current.feed, detail: null };
    this.#port.back();
  }

  observe(state: LibraryHistoryState | undefined): void {
    if (this.#current === null || state === undefined) return;
    if (sameState(state, this.#current)) return;
    this.#current = state;
    this.#targets.restoreTab(state.tab);
    if (state.tab !== DEVICE_TAB && this.#targets.feedIndex(state.tab) !== state.feed) {
      this.#targets.restoreFeed(state.tab, state.feed);
    }
    this.#targets.restoreDetail(state.tab, state.detail);
  }
}

export { LibraryHistory, NO_HISTORY };
export type { HistoryMode, HistoryPort, HistoryRecorder, HistoryTargets, LibraryHistoryState };
