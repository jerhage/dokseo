<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snapshot } from '@sveltejs/kit';
  import { afterNavigate, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import LibraryScreen from '$lib/domains/library/ui/LibraryScreen.svelte';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import { LibraryScrollView } from '$lib/domains/library/ui/library-scroll-view.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import SearchDialog from '$lib/domains/recognition/ui/capture/SearchDialog.svelte';
  import { CaptureSearchView } from '$lib/domains/recognition/ui/capture/capture-search.svelte';
  import { missingBookArrival } from '$lib/shared/reader-location';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const view = new LibraryView(container.library, notify);
  const find = new CaptureSearchView(container, comparePassages);
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

  onMount(() => () => find.dispose());
</script>

<LibraryShelfData library={container.library}>
  {#snippet children(shelf)}
    <LibraryScreen
      {view}
      shelfRead={shelf}
      {scroll}
      onsearcheverything={() => search?.searchEverything()}
      bind:query
    />

    <SearchDialog
      bind:this={search}
      book={null}
      books={shelf.searched}
      {find}
      tags={find.tags}
      covers={shelf.covers}
      counts={shelf.counts}
    />
  {/snippet}
</LibraryShelfData>
