import { createInfiniteQuery } from '@tanstack/svelte-query';
import type {
  Accessor,
  CreateInfiniteQueryOptions,
  DefaultError,
  InfiniteData,
  QueryClient,
  QueryKey,
} from '@tanstack/svelte-query';
import type { Page } from './page';
import { PagedAnnouncer } from './paged-announcer';
import { pagedReadStateOf, showingText, unknownTotal } from './read-paged-state';
import type { PagedProblem, PagedReadState, Total, TotalOf } from './read-paged-state';

type PagedAnnouncements<Failure> = {
  say(text: string): void;
  failed(problem: PagedProblem<Failure>): string;
  showing?(shown: number, total: Total): string;
};

type PagedSettings<Item, Cursor, Failure> = {
  readonly totalOf?: TotalOf<Item, Cursor>;
  readonly announcements?: PagedAnnouncements<Failure>;
};

interface ReadPagedQuery<Item, Failure> {
  readonly state: PagedReadState<Item, Failure>;
  loadMore(): void;
  refresh(): void;
  reload(): void;
}

function readPagedQuery<Item, Cursor, Failure, K extends QueryKey = QueryKey>(
  options: Accessor<
    CreateInfiniteQueryOptions<
      Page<Item, Cursor>,
      DefaultError,
      InfiniteData<Page<Item, Cursor>, Cursor>,
      K,
      Cursor
    >
  >,
  settings: PagedSettings<Item, Cursor, Failure> = {},
  client?: Accessor<QueryClient>,
): ReadPagedQuery<Item, Failure> {
  const query = createInfiniteQuery(options, client);
  const totalOf = settings.totalOf ?? unknownTotal;
  const state = $derived(pagedReadStateOf<Item, Cursor, Failure>(query, totalOf));
  const announcements = settings.announcements;

  if (announcements !== undefined) {
    const announcer = new PagedAnnouncer<Item, Failure>(
      { showing: announcements.showing ?? showingText, failed: announcements.failed },
      announcements.say,
    );
    $effect(() => {
      announcer.observe(state);
    });
  }

  return {
    get state() {
      return state;
    },
    loadMore() {
      const current = state;
      if (current.kind !== 'ready') return;
      if (current.more.kind !== 'more' && current.more.kind !== 'failed') return;
      void query.fetchNextPage({ cancelRefetch: false });
    },
    refresh() {
      void query.refetch();
    },
    reload() {
      void query.refetch();
    },
  };
}

export { readPagedQuery };
export type { PagedAnnouncements, PagedSettings, ReadPagedQuery };
