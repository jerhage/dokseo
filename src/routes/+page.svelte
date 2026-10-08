<script lang="ts">
  import type { Snapshot } from '@sveltejs/kit';
  import { onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { afterNavigate, goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/ui/components/toast-context';
  import { useContainer } from '$lib/context';
  import { CatalogHeaderSearch } from '$lib/domains/catalog/ui/catalog-header-search.svelte';
  import { catalogSession } from '$lib/domains/catalog/ui/catalog-session.svelte';
  import { CatalogTabsView } from '$lib/domains/catalog/ui/catalog-tabs.svelte';
  import LibraryTabs from '$lib/domains/catalog/ui/LibraryTabs.svelte';
  import OriginBadge from '$lib/domains/catalog/ui/OriginBadge.svelte';
  import OriginFilter from '$lib/domains/catalog/ui/OriginFilter.svelte';
  import { OriginFilterView } from '$lib/domains/catalog/ui/origin-filter.svelte';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import { bookMatchingChosen } from '$lib/domains/library/ui/book-matching.svelte';
  import { describeOpenFileError } from '$lib/domains/library/ui/book-upload.svelte';
  import { refreshLibrary } from '$lib/domains/library/ui/library-refresh';
  import { readingDefaultsChosen } from '$lib/domains/library/ui/reading-defaults.svelte';
  import type { BookId } from '$lib/shared/ids';
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
  const view = new LibraryView(container.library, notify);
  const scroll = new LibraryScrollView();
  const queryClient = useQueryClient();

  function readerHref(id: BookId): string {
    return `/read/${encodeURIComponent(id)}`;
  }

  const origins = new OriginFilterView(catalogSession, container.catalog);
  void origins.load();

  const catalogs = new CatalogTabsView(catalogSession, {
    cases: container.catalog,
    notify,
    matching: bookMatchingChosen,
    defaults: readingDefaultsChosen,
    describeOpenFile: describeOpenFileError,
    openBook: (id) => void goto(readerHref(id)),
    refreshLibrary: async () => {
      await Promise.all([origins.load(), refreshLibrary(queryClient)]);
    },
  });
  void catalogs.load();
  const catalogSearch = new CatalogHeaderSearch(catalogs, catalogSession);
  onDestroy(() => catalogs.dispose());

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

{#snippet withCatalogs(device: Snippet)}
  <LibraryTabs view={catalogs} search={catalogSearch} {readerHref} {device} />
{/snippet}

{#snippet originBadge(id: BookId)}
  <OriginBadge view={origins} {id} />
{/snippet}

{#snippet originControls()}
  <OriginFilter view={origins} />
{/snippet}

<LibraryShelfData library={container.library}>
  {#snippet children(shelf)}
    <LibraryScreen
      {view}
      shelfRead={shelf}
      {scroll}
      onsearcheverything={() => search?.searchEverything()}
      tabbed={catalogs.visible ? withCatalogs : undefined}
      bookBadge={origins.visible ? originBadge : undefined}
      bookFilter={origins.visible ? (id) => origins.matches(id) : undefined}
      filterControls={origins.visible ? originControls : undefined}
      headerSearch={catalogSearch.field}
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
            <UnreadableCaptures captures={find.unreadable} recognition={container.recognition} />
          {/snippet}
        </SearchDialog>
      {/snippet}
    </CaptureFindData>
  {/snippet}
</LibraryShelfData>
