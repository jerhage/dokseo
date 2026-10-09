import { match } from 'ts-pattern';
import { itemsOf } from './page';
import type { Page } from './page';
import { PagedFailure } from './paged-failure';
import { failureMessage } from './query-failure';

type Total = { readonly kind: 'known'; readonly count: number } | { readonly kind: 'unknown' };

type UnexpectedFailure = { readonly kind: 'unexpected'; readonly message: string };

type PagedProblem<Failure> = Failure | UnexpectedFailure;

type MoreState<Failure> =
  | { readonly kind: 'more' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly failure: PagedProblem<Failure> }
  | { readonly kind: 'end' };

type PagedReadState<Item, Failure> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly failure: PagedProblem<Failure> }
  | {
      readonly kind: 'ready';
      readonly items: readonly Item[];
      readonly total: Total;
      readonly refreshing: boolean;
      readonly more: MoreState<Failure>;
    };

type PagedFlags = {
  readonly isFetchNextPageError: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isFetching: boolean;
  readonly hasNextPage: boolean;
};

type PagedData<Item, Cursor> = { readonly pages: readonly Page<Item, Cursor>[] };

type PagedSnapshot<Item, Cursor> = PagedFlags &
  (
    | { readonly status: 'pending' }
    | { readonly status: 'error'; readonly isLoadingError: true; readonly error: unknown }
    | {
        readonly status: 'error';
        readonly isLoadingError: false;
        readonly error: unknown;
        readonly data: PagedData<Item, Cursor>;
      }
    | { readonly status: 'success'; readonly data: PagedData<Item, Cursor> }
  );

type TotalOf<Item, Cursor> = (pages: readonly Page<Item, Cursor>[]) => Total;

type PagedTexts<Failure> = {
  showing(shown: number, total: Total): string;
  failed(problem: PagedProblem<Failure>): string;
};

const UNKNOWN_TOTAL: Total = { kind: 'unknown' };

function unknownTotal(): Total {
  return UNKNOWN_TOTAL;
}

function knownTotal(count: number): Total {
  return { kind: 'known', count };
}

function problemOf<Failure>(cause: unknown): PagedProblem<Failure> {
  if (cause instanceof PagedFailure) return cause.failure;
  return { kind: 'unexpected', message: failureMessage(cause) };
}

function moreOf<Failure>(flags: PagedFlags, error: unknown): MoreState<Failure> {
  return match(flags)
    .returnType<MoreState<Failure>>()
    .with({ isFetchingNextPage: true }, () => ({ kind: 'loading' }))
    .with({ isFetchingNextPage: false, isFetchNextPageError: true }, () => ({
      kind: 'failed',
      failure: problemOf<Failure>(error),
    }))
    .with({ isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: true }, () => ({
      kind: 'more',
    }))
    .with({ isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false }, () => ({
      kind: 'end',
    }))
    .exhaustive();
}

function readyOf<Item, Cursor, Failure>(
  flags: PagedFlags,
  data: PagedData<Item, Cursor>,
  error: unknown,
  totalOf: TotalOf<Item, Cursor>,
): PagedReadState<Item, Failure> {
  return {
    kind: 'ready',
    items: itemsOf(data.pages),
    total: totalOf(data.pages),
    refreshing: flags.isFetching && !flags.isFetchingNextPage,
    more: moreOf<Failure>(flags, error),
  };
}

function pagedReadStateOf<Item, Cursor, Failure>(
  snapshot: PagedSnapshot<Item, Cursor>,
  totalOf: TotalOf<Item, Cursor> = unknownTotal,
): PagedReadState<Item, Failure> {
  return match(snapshot)
    .returnType<PagedReadState<Item, Failure>>()
    .with({ status: 'pending' }, () => ({ kind: 'loading' }))
    .with({ status: 'error', isLoadingError: true }, ({ error }) => ({
      kind: 'failed',
      failure: problemOf<Failure>(error),
    }))
    .with({ status: 'error', isLoadingError: false }, ({ data, error }) =>
      readyOf<Item, Cursor, Failure>(snapshot, data, error, totalOf),
    )
    .with({ status: 'success' }, ({ data }) =>
      readyOf<Item, Cursor, Failure>(snapshot, data, undefined, totalOf),
    )
    .exhaustive();
}

function showingText(shown: number, total: Total): string {
  return match(total)
    .with({ kind: 'known' }, ({ count }) => `Showing ${shown} of ${count}`)
    .with({ kind: 'unknown' }, () => `Showing ${shown}`)
    .exhaustive();
}

function announcementOf<Item, Failure>(
  state: PagedReadState<Item, Failure>,
  texts: PagedTexts<Failure>,
): string | null {
  return match(state)
    .returnType<string | null>()
    .with({ kind: 'loading' }, { kind: 'failed' }, () => null)
    .with({ kind: 'ready', refreshing: true }, () => null)
    .with({ kind: 'ready', refreshing: false }, ({ items, total, more }) =>
      match(more)
        .returnType<string | null>()
        .with({ kind: 'loading' }, () => null)
        .with({ kind: 'failed' }, ({ failure }) => texts.failed(failure))
        .with({ kind: 'more' }, { kind: 'end' }, () => texts.showing(items.length, total))
        .exhaustive(),
    )
    .exhaustive();
}

export { UNKNOWN_TOTAL, announcementOf, knownTotal, pagedReadStateOf, showingText, unknownTotal };
export type {
  MoreState,
  PagedTexts,
  PagedProblem,
  PagedReadState,
  PagedSnapshot,
  Total,
  TotalOf,
  UnexpectedFailure,
};
