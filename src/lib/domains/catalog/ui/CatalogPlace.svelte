<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { Catalog } from '../domain/catalog';
  import type { BookOriginLink } from '../domain/remote-item';
  import { useCatalogDeps } from './catalog-context';
  import type { CatalogDownloads } from './catalog-downloads.svelte';
  import { listingOf } from './catalog-feed-read';
  import { createDetails } from './details-focus';
  import type { FeedReport } from './feed-report';
  import { readingOf } from './feed-report';
  import { feedLocationOf } from './navigation';
  import type { PlaceId } from './navigation';
  import { resolvingKeyOf } from './link-resolution';
  import { createScrollRestore, scrollMemory } from './scroll-memory';
  import { createSelection } from './selection.svelte';
  import CatalogFeedData from './CatalogFeedData.svelte';
  import CatalogFeedLinks from './CatalogFeedLinks.svelte';
  import CatalogMore from './CatalogMore.svelte';
  import CatalogPublications from './CatalogPublications.svelte';
  import CatalogUnlock from './CatalogUnlock.svelte';

  type Props = {
    readonly catalog: Catalog;
    readonly placeId: PlaceId;
    readonly downloads: CatalogDownloads;
    readonly held: ReadonlyMap<string, BookOriginLink> | null;
  };

  let { catalog, placeId, downloads, held }: Props = $props();

  const deps = useCatalogDeps();

  const { session, navigation } = deps;
  const here = untrack(() => placeId);
  const place = $derived(navigation.place(here));
  const selection = createSelection(session.selectionOf(here), (ids) =>
    session.keepSelection(here, ids),
  );
  const resolving = $derived(resolvingKeyOf(session.opening, catalog.id));
  const details = createDetails();
  const restore = createScrollRestore(
    session.scrollOf(here),
    (top) => session.keepScroll(here, top),
    tick,
  );

  function report(next: FeedReport): void {
    session.keepReading(here, readingOf(next));
    if (next.kind === 'failed') return;
    navigation.identify(here, next.head.id);
  }

  function settle(): void {
    void restore.settled();
  }
</script>

{#if place !== null}
  <div class="col gap-4" {@attach scrollMemory(restore)}>
    <CatalogFeedData
      {catalog}
      cases={deps.cases}
      location={feedLocationOf(place)}
      path={navigation.pathOf(here)}
      {held}
      onreport={report}
    >
      {#snippet locked(lock, retry)}
        <CatalogUnlock
          {catalog}
          refused={lock.refused}
          onunlock={(password) => {
            deps.cases.unlockCatalog(catalog.id, password);
            retry();
          }}
        />
      {/snippet}
      {#snippet children(feed)}
        {@const listing = listingOf(feed.items)}
        <div class="col gap-4" {@attach settle}>
          {#if feed.head.kind === 'navigation'}
            <CatalogFeedLinks
              label={feed.head.title}
              links={listing.links}
              {resolving}
              onopen={(link) =>
                void navigation.follow(catalog.id, link, deps.linkReader(catalog.id))}
            />
          {:else}
            <CatalogPublications
              {catalog}
              publications={listing.publications}
              blobs={feed.covers}
              {downloads}
              {selection}
              {details}
              {navigation}
              readerHref={deps.readerHref}
            />
          {/if}
          <CatalogMore more={feed.more} protocol={catalog.protocol} onmore={feed.loadMore} />
        </div>
      {/snippet}
    </CatalogFeedData>
  </div>
{/if}
