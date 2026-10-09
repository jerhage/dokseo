import { describe, expect, it, vi } from 'vitest';
import type { Page } from './page';
import { PagedFailure } from './paged-failure';
import { readPagedQuery } from './read-paged-query.svelte';
import type { PagedSettings, ReadPagedQuery } from './read-paged-query.svelte';
import { knownTotal } from './read-paged-state';
import { createTestQueryClient } from './testing/query-client';

type Missing = { readonly kind: 'offline' };

const OFFLINE: Missing = { kind: 'offline' };

interface PendingRead {
  readonly cursor: number;
  answer(page: Page<string, number>): void;
  refuse(cause: unknown): void;
}

function last(items: readonly string[]): Page<string, number> {
  return { items, next: null };
}

function more(items: readonly string[], next: number): Page<string, number> {
  return { items, next };
}

function observePaged(settings: PagedSettings<string, number, Missing> = {}) {
  const reads: PendingRead[] = [];
  const client = createTestQueryClient();
  const paged = readPagedQuery<string, number, Missing>(
    () => ({
      queryKey: ['pages'],
      initialPageParam: 0,
      getNextPageParam: (page) => page.next,
      queryFn: ({ pageParam }) =>
        new Promise<Page<string, number>>((resolve, reject) => {
          reads.push({ cursor: pageParam, answer: resolve, refuse: reject });
        }),
    }),
    settings,
    () => client,
  );

  return {
    reads,
    paged,
    read(position: number): PendingRead {
      const read = reads[position];
      if (read === undefined) throw new Error(`No read started at ${position}`);
      return read;
    },
    async settled(check: () => void): Promise<void> {
      await vi.waitFor(check);
    },
  };
}

function itemsShown(paged: ReadPagedQuery<string, Missing>): readonly string[] {
  return paged.state.kind === 'ready' ? paged.state.items : [];
}

function moreKind(paged: ReadPagedQuery<string, Missing>): string {
  return paged.state.kind === 'ready' ? paged.state.more.kind : paged.state.kind;
}

describe('readPagedQuery', () => {
  it('loads the first page, then reports it ready with more to load', async () => {
    const query = observePaged();

    expect(query.paged.state).toEqual({ kind: 'loading' });
    query.read(0).answer(more(['a', 'b'], 2));

    await query.settled(() => expect(moreKind(query.paged)).toBe('more'));
    expect(itemsShown(query.paged)).toEqual(['a', 'b']);
    expect(query.read(0).cursor).toBe(0);
  });

  it('appends the next page on loadMore and reports the end after the last page', async () => {
    const query = observePaged();
    query.read(0).answer(more(['a'], 1));
    await query.settled(() => expect(moreKind(query.paged)).toBe('more'));

    query.paged.loadMore();
    await query.settled(() => expect(query.reads).toHaveLength(2));
    expect(query.read(1).cursor).toBe(1);
    await query.settled(() => expect(moreKind(query.paged)).toBe('loading'));
    query.read(1).answer(last(['b']));

    await query.settled(() => expect(moreKind(query.paged)).toBe('end'));
    expect(itemsShown(query.paged)).toEqual(['a', 'b']);
  });

  it('starts no read on loadMore at the end', async () => {
    const query = observePaged();
    query.read(0).answer(last(['a']));
    await query.settled(() => expect(moreKind(query.paged)).toBe('end'));

    query.paged.loadMore();
    await Promise.resolve();

    expect(query.reads).toHaveLength(1);
  });

  it('starts no second read on loadMore while the next page loads', async () => {
    const query = observePaged();
    query.read(0).answer(more(['a'], 1));
    await query.settled(() => expect(moreKind(query.paged)).toBe('more'));
    query.paged.loadMore();
    await query.settled(() => expect(moreKind(query.paged)).toBe('loading'));

    query.paged.loadMore();
    await Promise.resolve();

    expect(query.reads).toHaveLength(2);
  });

  it('starts no read on loadMore before the first page arrives', async () => {
    const query = observePaged();

    query.paged.loadMore();
    await Promise.resolve();

    expect(query.reads).toHaveLength(1);
  });

  it('keeps the items and reports the typed failure when the next page throws a PagedFailure', async () => {
    const query = observePaged();
    query.read(0).answer(more(['a'], 1));
    await query.settled(() => expect(moreKind(query.paged)).toBe('more'));
    query.paged.loadMore();
    await query.settled(() => expect(query.reads).toHaveLength(2));

    query.read(1).refuse(new PagedFailure<Missing>(OFFLINE));

    await query.settled(() => expect(moreKind(query.paged)).toBe('failed'));
    expect(query.paged.state).toMatchObject({ items: ['a'], more: { failure: OFFLINE } });
  });

  it('retries the next page on loadMore after it failed and appends it', async () => {
    const query = observePaged();
    query.read(0).answer(more(['a'], 1));
    await query.settled(() => expect(moreKind(query.paged)).toBe('more'));
    query.paged.loadMore();
    await query.settled(() => expect(query.reads).toHaveLength(2));
    query.read(1).refuse(new PagedFailure<Missing>(OFFLINE));
    await query.settled(() => expect(moreKind(query.paged)).toBe('failed'));

    query.paged.loadMore();
    await query.settled(() => expect(query.reads).toHaveLength(3));
    query.read(2).answer(last(['b']));

    await query.settled(() => expect(moreKind(query.paged)).toBe('end'));
    expect(itemsShown(query.paged)).toEqual(['a', 'b']);
  });

  it('retries the first page on reload after it failed', async () => {
    const query = observePaged();
    query.read(0).refuse(new PagedFailure<Missing>(OFFLINE));
    await query.settled(() =>
      expect(query.paged.state).toEqual({ kind: 'failed', failure: OFFLINE }),
    );

    query.paged.reload();
    await query.settled(() => expect(query.reads).toHaveLength(2));
    await query.settled(() => expect(query.paged.state).toEqual({ kind: 'loading' }));
    query.read(1).answer(last(['a']));

    await query.settled(() => expect(moreKind(query.paged)).toBe('end'));
  });

  it('keeps the items on screen and reports refreshing while refresh reads again', async () => {
    const query = observePaged();
    query.read(0).answer(last(['a']));
    await query.settled(() => expect(moreKind(query.paged)).toBe('end'));

    query.paged.refresh();
    await query.settled(() => expect(query.reads).toHaveLength(2));

    await query.settled(() =>
      expect(query.paged.state).toMatchObject({ items: ['a'], refreshing: true }),
    );
    query.read(1).answer(last(['a', 'b']));
    await query.settled(() =>
      expect(query.paged.state).toMatchObject({ items: ['a', 'b'], refreshing: false }),
    );
  });

  it('says the loaded count once the next page of loadMore arrives, and nothing for the first page', async () => {
    const said: string[] = [];
    const query = observePaged({
      totalOf: () => knownTotal(5),
      announcements: { say: (text) => said.push(text), failed: (problem) => problem.kind },
    });
    query.read(0).answer(more(['a'], 1));
    await query.settled(() => expect(moreKind(query.paged)).toBe('more'));
    expect(said).toEqual([]);

    query.paged.loadMore();
    await query.settled(() => expect(query.reads).toHaveLength(2));
    query.read(1).answer(last(['b']));

    await query.settled(() => expect(said).toEqual(['Showing 2 of 5']));
  });

  it('says the failure text when the next page of loadMore fails, once for a repeated failure', async () => {
    const said: string[] = [];
    const query = observePaged({
      announcements: { say: (text) => said.push(text), failed: (problem) => problem.kind },
    });
    query.read(0).answer(more(['a'], 1));
    await query.settled(() => expect(moreKind(query.paged)).toBe('more'));
    query.paged.loadMore();
    await query.settled(() => expect(query.reads).toHaveLength(2));
    query.read(1).refuse(new PagedFailure<Missing>(OFFLINE));
    await query.settled(() => expect(said).toEqual(['offline']));

    query.paged.loadMore();
    await query.settled(() => expect(query.reads).toHaveLength(3));
    query.read(2).refuse(new PagedFailure<Missing>(OFFLINE));
    await query.settled(() => expect(moreKind(query.paged)).toBe('failed'));

    expect(said).toEqual(['offline']);
  });

  it('reads the total from the loaded pages through the supplied function', async () => {
    const query = observePaged({ totalOf: () => knownTotal(7) });
    query.read(0).answer(last(['a']));

    await query.settled(() =>
      expect(query.paged.state).toMatchObject({ total: { kind: 'known', count: 7 } }),
    );
  });
  it('keeps the extra fields of a page and lets the total read them', async () => {
    type Headed = Page<string, number> & { readonly heading: string; readonly count: number };
    const client = createTestQueryClient();
    const paged = readPagedQuery<string, number, Missing, Headed>(
      () => ({
        queryKey: ['headed'],
        initialPageParam: 0,
        getNextPageParam: (page) => page.next,
        queryFn: () => Promise.resolve({ items: ['a'], next: null, heading: 'Books', count: 9 }),
      }),
      { totalOf: (pages) => knownTotal(pages[0]?.count ?? 0) },
      () => client,
    );

    await vi.waitFor(() => expect(paged.pages.map((page) => page.heading)).toEqual(['Books']));
    expect(paged.state).toMatchObject({ total: { kind: 'known', count: 9 } });
  });
});
