<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { afterNavigate, goto, pushState, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/ui/components/toast-context';
  import { ACTION_NOTICE_MS } from '$lib/shared/notice';
  import { toastNotify } from '$lib/shared/notice-toast';
  import type { BookId } from '$lib/shared/ids';
  import type { RemotePublication } from '../domain/remote-publication';
  import type { CatalogReads } from '../queries/catalog-queries';
  import { provideCatalogDeps } from './catalog-context';
  import { catalogSession } from './catalog-session.svelte';
  import type { CatalogDeps, CatalogUseCases } from './catalog-deps';
  import { searchFieldFor } from './catalog-search-field';
  import { listedCatalogs, listedOrigins } from './catalog-list';
  import { refreshOrigins } from './catalog-refresh';
  import { createFeedReadings } from './feed-readings.svelte';
  import { createFeedSearch } from './feed-search.svelte';
  import type { DeviceDetailsLink } from './device-details.svelte';
  import type { DeviceDetailsView, LibraryExtras, LibraryNeeds } from './library-extras';
  import { DEVICE_TAB, effectiveTab } from './library-tabs';
  import { linkReaderFor, readFirstPage } from './link-resolution';
  import type { FirstPageReader } from './link-resolution';
  import { browserId } from './navigation';
  import { createNavigation } from './navigation.svelte';
  import type { HistoryPort } from './navigation.svelte';
  import { createOriginFilter } from './origin-filter.svelte';
  import { matches } from './origin-filter';
  import CatalogsData from './CatalogsData.svelte';
  import LibraryTabs from './LibraryTabs.svelte';
  import OriginBadge from './OriginBadge.svelte';
  import OriginFilter from './OriginFilter.svelte';
  import OriginSource from './OriginSource.svelte';
  import OriginsData from './OriginsData.svelte';

  type Props = {
    readonly catalog: CatalogReads & CatalogUseCases;
    readonly needs: LibraryNeeds;
    readonly deviceDetails: DeviceDetailsLink;
    readonly details: DeviceDetailsView;
    readonly content: Snippet<[LibraryExtras]>;
  };

  let { catalog, needs, deviceDetails, details, content }: Props = $props();

  const queryClient = useQueryClient();
  const notify = toastNotify(getToaster());
  const session = catalogSession;

  const port: HistoryPort = {
    push: (state) => pushState('', { library: state }),
    replace: (state) => replaceState('', { library: state }),
    back: () => history.back(),
    go: (delta) => history.go(delta),
  };
  const firstPage: FirstPageReader = (tab, location, path) =>
    readFirstPage(queryClient, catalog, tab, location, path);
  const navigation = createNavigation(session, port, browserId, firstPage);
  const search = createFeedSearch();
  const readings = createFeedReadings(queryClient);
  const originFilter = createOriginFilter(session.originFilter, (chosen) => {
    session.originFilter = chosen;
  });

  function announce(
    verb: 'Added' | 'Updated',
    publication: RemotePublication,
    downloaded: BookId,
  ): void {
    notify({
      tone: 'success',
      title: `${verb} ${publication.title}`,
      action: { label: 'Open', run: () => void goto(needs.readerHref(downloaded)) },
      duration: ACTION_NOTICE_MS,
    });
    void Promise.all([refreshOrigins(queryClient), needs.refreshLibrary(queryClient)]);
  }

  const deps: CatalogDeps = {
    get cases() {
      return catalog;
    },
    session,
    navigation,
    search,
    readings,
    linkReader: (id) => linkReaderFor(queryClient, catalog, id),
    choices: { matching: () => needs.matching(), defaults: () => needs.defaults() },
    describeOpenFile: (error) => needs.describeOpenFile(error),
    readerHref: (id) => needs.readerHref(id),
    downloaded: (publication, downloaded) => announce('Added', publication, downloaded),
    updated: (publication, updated) => announce('Updated', publication, updated),
    refreshOrigins: () => refreshOrigins(queryClient),
  };

  provideCatalogDeps(deps);

  onMount(() => deviceDetails.connect(navigation));

  function followHistory(): void {
    const detailsOpen = navigation.detailsOf(DEVICE_TAB) !== null;
    navigation.observe(page.state.library);
    if (detailsOpen && navigation.detailsOf(DEVICE_TAB) === null) details.hide();
  }

  afterNavigate(() => navigation.arrive(page.state.library));

  onDestroy(() => search.dispose());
</script>

<svelte:window onpopstate={followHistory} />

<CatalogsData {catalog}>
  {#snippet children(catalogsState)}
    {@const catalogs = listedCatalogs(catalogsState)}
    <OriginsData {catalog}>
      {#snippet children(originsState)}
        {@const listed = listedOrigins(originsState)}
        {@const selected = effectiveTab(navigation.tab, catalogs)}
        {@const selectedCatalog = catalogs.find((candidate) => candidate.id === selected)}
        {#snippet withCatalogs(device: Snippet)}
          <LibraryTabs {catalogs} {device} />
        {/snippet}
        {#snippet badge(id: BookId)}
          <OriginBadge {listed} {id} />
        {/snippet}
        {#snippet source(id: BookId)}
          <OriginSource {listed} {id} />
        {/snippet}
        {#snippet controls()}
          <OriginFilter catalogs={listed.catalogs} filter={originFilter} />
        {/snippet}
        {@render content({
          tabbed: catalogs.length > 0 ? withCatalogs : undefined,
          bookBadge: listed.catalogs.length > 0 ? badge : undefined,
          bookSource: listed.catalogs.length > 0 ? source : undefined,
          bookFilter:
            listed.catalogs.length > 0
              ? (id) => matches(originFilter.chosen, listed, id)
              : undefined,
          filterControls: listed.catalogs.length > 0 ? controls : undefined,
          headerSearch:
            selectedCatalog === undefined ? undefined : searchFieldFor(selectedCatalog, deps),
        })}
      {/snippet}
    </OriginsData>
  {/snippet}
</CatalogsData>
