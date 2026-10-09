<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createQueries } from '@tanstack/svelte-query';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import { readPagedQuery } from '$lib/shared/read-paged-query.svelte';
  import type { Catalog } from '../domain/catalog';
  import type { BookOriginLink } from '../domain/remote-item';
  import { publicationsOf } from '../domain/catalog-feed';
  import type { FeedEntry, FeedLocation, FeedPage, TrailStep } from '../domain/catalog-feed';
  import {
    catalogCoverQuery,
    catalogFeedQuery,
    totalOfPages,
  } from '../queries/catalog-feed-queries';
  import type {
    CoverReads,
    FeedKey,
    FeedPageParam,
    FeedProblem,
    FeedReads,
  } from '../queries/catalog-feed-queries';
  import { feedProblemText } from './catalog-texts';
  import { coverBlobsOf, coverTargetsOf, lockOf, readyFeedOf } from './catalog-feed-read';
  import type { CatalogFeedRead, FeedLock, ReadyFeed } from './catalog-feed-read';

  type Props = {
    readonly catalog: Catalog;
    readonly cases: FeedReads & CoverReads;
    readonly location: FeedLocation;
    readonly path: readonly TrailStep[];
    readonly held: ReadonlyMap<string, BookOriginLink> | null;
    readonly onretry: () => void;
    readonly locked: Snippet<[FeedLock, () => void]>;
    readonly children: Snippet<[ReadyFeed]>;
  };

  let { catalog, cases, location, path, held, onretry, locked, children }: Props = $props();

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
    covers: coverBlobsOf(publications, targets, coverReads),
    loadMore: () => feed.loadMore(),
    refresh: () => feed.refresh(),
    reload: () => feed.reload(),
  });
  const lock = $derived(lockOf(feed.state));
  const ready = $derived(held === null ? null : readyFeedOf(current));

  function retry(): void {
    feed.reload();
    onretry();
  }
</script>

{#if lock !== null}
  {@render locked(lock, retry)}
{:else if feed.state.kind === 'failed'}
  <Alert variant="warning" title="This catalog could not be read.">
    {feedProblemText(feed.state.failure, catalog.protocol)}
    {#snippet actions()}
      <Button size="sm" onclick={retry}>Try again</Button>
    {/snippet}
  </Alert>
{:else if ready === null}
  <EmptyState live message="Reading the catalog…" />
{:else}
  {@render children(ready)}
{/if}

<div class="visually-hidden" aria-live="polite">{announcement}</div>
