<script lang="ts">
  import type { Snapshot } from '@sveltejs/kit';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import LibraryScreen from '$lib/domains/library/ui/LibraryScreen.svelte';
  import { LibraryScrollView } from '$lib/domains/library/ui/library-scroll-view.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import CapturePalette from '$lib/domains/recognition/ui/capture/CapturePalette.svelte';
  import { CaptureSearchView } from '$lib/domains/recognition/ui/capture/capture-search.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import { MISSING_BOOK_PARAMETER, missingBookNotice } from '$lib/shared/reader-location';

  const container = useContainer();
  const view = new LibraryView(container);
  const find = new CaptureSearchView(container);
  const scroll = new LibraryScrollView();
  const notice = $derived(missingBookNotice(page.url.searchParams.get(MISSING_BOOK_PARAMETER)));
  const books = $derived(
    view.books.map((book) => ({
      id: book.id,
      title: book.title,
      language: book.language,
      direction: effectiveDirection(book.direction, book.layoutKind),
    })),
  );

  let query = $state('');

  export const snapshot: Snapshot<number> = {
    capture: () => scroll.capture(),
    restore: (top) => scroll.restore(top),
  };

  afterNavigate((navigation) => scroll.arrive(navigation.type, navigation.from?.route.id ?? null));

  $effect(() => {
    void view.load();
    return () => {
      view.dispose();
      find.dispose();
    };
  });
</script>

<LibraryScreen {view} {scroll} {notice} bind:query />

<CapturePalette
  book={null}
  {books}
  {find}
  tags={find.tags}
  covers={view.covers}
  counts={view.imageCounts}
/>
