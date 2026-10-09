import type { CatalogId } from '$lib/shared/ids';
import type { SearchDraft } from './catalog-search';
import type { EntryId } from './navigation';

const SEARCH_DEBOUNCE_MS = 400;

type SearchClock = { readonly after: (ms: number, run: () => void) => () => void };

type RunSearch = (text: string) => EntryId;

const BROWSER_CLOCK: SearchClock = {
  after: (ms, run) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
};

function createFeedSearch(clock: SearchClock = BROWSER_CLOCK) {
  let drafts = $state.raw<ReadonlyMap<CatalogId, SearchDraft>>(new Map());
  const pending = new Map<CatalogId, () => void>();

  function keep(id: CatalogId, draft: SearchDraft): void {
    drafts = new Map(drafts).set(id, draft);
  }

  function cancel(id: CatalogId): void {
    pending.get(id)?.();
    pending.delete(id);
  }

  return {
    draftOf(id: CatalogId): SearchDraft | null {
      return drafts.get(id) ?? null;
    },
    type(id: CatalogId, text: string, entry: EntryId, run: RunSearch): void {
      keep(id, { text, entry });
      cancel(id);
      pending.set(
        id,
        clock.after(SEARCH_DEBOUNCE_MS, () => {
          pending.delete(id);
          keep(id, { text, entry: run(text) });
        }),
      );
    },
    submit(id: CatalogId, text: string, run: RunSearch): void {
      cancel(id);
      keep(id, { text, entry: run(text) });
    },
    dispose(): void {
      for (const stop of pending.values()) stop();
      pending.clear();
    },
  };
}

export { SEARCH_DEBOUNCE_MS, createFeedSearch };
export type { RunSearch, SearchClock };
