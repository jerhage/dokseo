<script lang="ts">
  import type { Snapshot } from '@sveltejs/kit';
  import { afterNavigate, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/ui/components/toast-context';
  import { useContainer } from '$lib/context';
  import { createDeviceDetails } from '$lib/domains/catalog/ui/device-details';
  import LibraryWithCatalogs from '$lib/domains/catalog/ui/LibraryWithCatalogs.svelte';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import { CATALOG_NEEDS } from '$lib/domains/library/ui/catalog-needs';
  import LibraryScreen from '$lib/domains/library/ui/LibraryScreen.svelte';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import { LibraryScrollView } from '$lib/domains/library/ui/library-scroll-view.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import CaptureFindData from '$lib/domains/recognition/ui/capture/CaptureFindData.svelte';
  import UnreadableCaptures from '$lib/domains/recognition/ui/capture/UnreadableCaptures.svelte';
  import SearchDialog from '$lib/domains/recognition/ui/capture/SearchDialog.svelte';
  import PageTitle from '$lib/shared/PageTitle.svelte';
  import { missingBookArrival } from '$lib/shared/reader-location';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const deviceDetails = createDeviceDetails();
  const view = new LibraryView(container.library, notify, deviceDetails.hooks);
  const scroll = new LibraryScrollView();

  let query = $state('');
  let search = $state<ReturnType<typeof SearchDialog> | null>();

  export const snapshot: Snapshot<number> = {
    capture: () => scroll.capture(),
    restore: (top) => scroll.restore(top),
  };

  afterNavigate((navigation) => {
    scroll.arrive(navigation.type, navigation.from?.route.id ?? null);
    const missing = missingBookArrival(page.url);
    if (missing === null) return;
    notify({ tone: 'warning', title: missing.notice });
    replaceState(missing.cleaned, page.state);
  });
</script>

<PageTitle screen="Library" />

<LibraryWithCatalogs
  catalog={container.catalog}
  needs={CATALOG_NEEDS}
  {deviceDetails}
  details={view.details}
>
  {#snippet content(extras)}
    <LibraryShelfData library={container.library}>
      {#snippet children(shelf)}
        <LibraryScreen
          {view}
          shelfRead={shelf}
          {scroll}
          onsearcheverything={() => search?.searchEverything()}
          tabbed={extras.tabbed}
          bookBadge={extras.bookBadge}
          bookSource={extras.bookSource}
          bookFilter={extras.bookFilter}
          filterControls={extras.filterControls}
          headerSearch={extras.headerSearch}
          bind:query
        />

        <CaptureFindData recognition={container.recognition}>
          {#snippet children(find)}
            <SearchDialog
              bind:this={search}
              book={null}
              books={shelf.searched}
              {find}
              passages={comparePassages}
              tags={find.tags}
              covers={shelf.covers}
              counts={shelf.counts}
            >
              {#snippet notice()}
                <UnreadableCaptures
                  captures={find.unreadable}
                  recognition={container.recognition}
                />
              {/snippet}
            </SearchDialog>
          {/snippet}
        </CaptureFindData>
      {/snippet}
    </LibraryShelfData>
  {/snippet}
</LibraryWithCatalogs>
