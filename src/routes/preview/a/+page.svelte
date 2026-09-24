<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import LibraryScreen from '$lib/domains/library/ui/redesign/a/LibraryScreen.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import CapturePalette from '$lib/domains/recognition/ui/redesign/CapturePalette.svelte';
  import { CaptureSearchView } from '$lib/domains/recognition/ui/capture/capture-search.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import { MISSING_BOOK_PARAMETER, missingBookNotice } from '$lib/shared/reader-location';

  const container = useContainer();
  const view = new LibraryView(container);
  const find = new CaptureSearchView(container);
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

  $effect(() => {
    void view.load();
    return () => {
      view.dispose();
      find.dispose();
    };
  });
</script>

<LibraryScreen {view} {notice} bind:query />

<CapturePalette
  book={null}
  {books}
  {find}
  tags={find.tags}
  covers={view.covers}
  counts={view.imageCounts}
/>
