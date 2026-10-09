<script lang="ts">
  import { onMount } from 'svelte';
  import Breadcrumb from '$lib/ui/components/Breadcrumb.svelte';
  import type { BookId } from '$lib/shared/ids';
  import type { CoverReads, FeedReads, HeldReads } from '../queries/catalog-feed-queries';
  import type { HeaderField } from './catalog-search';
  import type { CatalogBrowseView } from './catalog-browse.svelte';
  import { LOADING_FEED } from './catalog-feed-read';
  import CatalogFeedData from './CatalogFeedData.svelte';
  import CatalogFeedLinks from './CatalogFeedLinks.svelte';
  import CatalogMore from './CatalogMore.svelte';
  import CatalogPublications from './CatalogPublications.svelte';
  import CatalogSearchField from './CatalogSearchField.svelte';
  import CatalogUnlock from './CatalogUnlock.svelte';
  import { scrollMemory } from './scroll-memory';

  type Props = {
    readonly view: CatalogBrowseView;
    readonly feeds: FeedReads & CoverReads & HeldReads;
    readonly search: HeaderField;
    readonly readerHref: (id: BookId) => string;
  };

  let { view, feeds, search, readerHref }: Props = $props();

  let feedData = $state<ReturnType<typeof CatalogFeedData> | null>(null);

  onMount(() => {
    view.start();
    return view.bindFeed(() => feedData?.read() ?? LOADING_FEED);
  });
</script>

<div class="col gap-4" {@attach scrollMemory((scroller) => view.bindScroller(scroller))}>
  <CatalogSearchField field={search} />
  <Breadcrumb items={view.crumbs} label="Catalog path" />

  {#key view.readingKey}
    <CatalogFeedData
      bind:this={feedData}
      catalog={view.catalog}
      cases={feeds}
      location={view.reading}
      path={view.position.path}
      onhead={(head) => view.headLoaded(head)}
    >
      {#snippet locked(lock)}
        <CatalogUnlock {view} refused={lock.refused} />
      {/snippet}
      {#snippet children(feed)}
        {#if feed.head.kind === 'navigation'}
          <CatalogFeedLinks
            label={feed.head.title}
            links={view.links}
            onopen={(link) => view.openLink(link)}
          />
        {:else}
          <CatalogPublications {view} publications={view.entries} {readerHref} />
        {/if}
        <CatalogMore more={feed.more} protocol={view.catalog.protocol} onmore={feed.loadMore} />
      {/snippet}
    </CatalogFeedData>
  {/key}
</div>
