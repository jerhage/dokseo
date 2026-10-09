<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createQueries } from '@tanstack/svelte-query';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import { readPagedQuery } from '$lib/shared/read-paged-query.svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { Catalog } from '../domain/catalog';
  import { publicationsOf } from '../domain/catalog-feed';
  import type {
    FeedEntry,
    FeedHead,
    FeedLocation,
    FeedPage,
    TrailStep,
  } from '../domain/catalog-feed';
  import {
    catalogCoverQuery,
    catalogFeedQuery,
    heldOriginsQuery,
    totalOfPages,
  } from '../queries/catalog-feed-queries';
  import type {
    CoverReads,
    FeedKey,
    FeedPageParam,
    FeedProblem,
    FeedReads,
    HeldReads,
  } from '../queries/catalog-feed-queries';
  import { feedProblemText } from './catalog-texts';
  import { coverBlobsOf, coverTargetsOf, heldOf, lockOf, readyFeedOf } from './catalog-feed-read';
  import type { CatalogFeedRead, FeedLock, ReadyFeed } from './catalog-feed-read';

  type Props = {
    readonly catalog: Catalog;
    readonly cases: FeedReads & CoverReads & HeldReads;
    readonly location: FeedLocation;
    readonly path: readonly TrailStep[];
    readonly onhead: (head: FeedHead) => void;
    readonly locked: Snippet<[FeedLock]>;
    readonly children: Snippet<[ReadyFeed]>;
  };

  let { catalog, cases, location, path, onhead, locked, children }: Props = $props();

  let announcement = $state('');

  const feed = readPagedQuery<FeedEntry, FeedPageParam, FeedProblem, FeedPage, FeedKey>(
    () => catalogFeedQuery(cases, catalog.id, location, path),
    {
      totalOf: totalOfPages,
      announcements: {
        say: (text) => {
          announcement = text;
        },
        failed: (problem) => feedProblemText(problem, catalog.protocol),
      },
    },
  );
  const held = readQuery(() => heldOriginsQuery(cases, catalog.id));
  const first = $derived(feed.pages[0] ?? null);
  const publications = $derived(
    feed.state.kind === 'ready' ? publicationsOf(feed.state.items) : [],
  );
  const targets = $derived(coverTargetsOf(publications));
  const coverReads = createQueries(() => ({
    queries: targets.map((target) => catalogCoverQuery(cases, catalog.id, target.href)),
    combine: (results) => results.map((result) => result.data),
  }));
  const current: CatalogFeedRead = $derived({
    state: feed.state,
    head: first,
    held: heldOf(held.state),
    covers: coverBlobsOf(publications, targets, coverReads),
    loadMore: () => feed.loadMore(),
    refresh: () => feed.refresh(),
    reload: () => feed.reload(),
  });
  const lock = $derived(lockOf(feed.state));
  const ready = $derived(held.state.kind === 'loading' ? null : readyFeedOf(current));

  let reported: FeedHead | null = null;

  $effect(() => {
    if (first === null || first === reported) return;
    reported = first;
    onhead(first);
  });

  export function read(): CatalogFeedRead {
    return current;
  }
</script>

{#if lock !== null}
  {@render locked(lock)}
{:else if feed.state.kind === 'failed'}
  <Alert variant="warning" title="This catalog could not be read.">
    {feedProblemText(feed.state.failure, catalog.protocol)}
    {#snippet actions()}
      <Button size="sm" onclick={() => feed.reload()}>Try again</Button>
    {/snippet}
  </Alert>
{:else if ready === null}
  <EmptyState live message="Reading the catalog…" />
{:else}
  {@render children(ready)}
{/if}

<div class="visually-hidden" aria-live="polite">{announcement}</div>
