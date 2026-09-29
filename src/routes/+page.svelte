<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snapshot } from '@sveltejs/kit';
  import { afterNavigate, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import LibraryScreen from '$lib/domains/library/ui/LibraryScreen.svelte';
  import { LibraryScrollView } from '$lib/domains/library/ui/library-scroll-view.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import SearchDialog from '$lib/domains/recognition/ui/capture/SearchDialog.svelte';
  import { CaptureSearchView } from '$lib/domains/recognition/ui/capture/capture-search.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import { missingBookArrival } from '$lib/shared/reader-location';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const view = new LibraryView(container, notify);
  const find = new CaptureSearchView(container);
  const scroll = new LibraryScrollView();
  const books = $derived(
    view.books.map((book) => ({
      id: book.id,
      title: book.title,
      language: book.language,
      direction: effectiveDirection(book.direction, book.layoutKind),
    })),
  );

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

  onMount(() => {
    void view.load();
    return () => {
      view.dispose();
      find.dispose();
    };
  });
</script>

<LibraryScreen {view} {scroll} onsearcheverything={() => search?.searchEverything()} bind:query />

<SearchDialog
  bind:this={search}
  book={null}
  {books}
  {find}
  tags={find.tags}
  covers={view.covers}
  counts={view.imageCounts}
/>
