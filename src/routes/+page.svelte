<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import LibraryScreen from '$lib/domains/library/ui/LibraryScreen.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import CaptureResults from '$lib/domains/recognition/ui/capture/CaptureResults.svelte';
  import { CaptureSearchView } from '$lib/domains/recognition/ui/capture/capture-search.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import { MISSING_BOOK_PARAMETER, missingBookNotice } from '$lib/shared/reader-location';

  const container = useContainer();
  const view = new LibraryView(container);
  const found = new CaptureSearchView(container);
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

  const captureMatches = $derived(found.matchCount(books, query));

  $effect(() => {
    void view.load();
    void found.load();
    return () => {
      view.dispose();
      found.dispose();
    };
  });
</script>

<LibraryScreen {view} {notice} {captureMatches} bind:query>
  {#snippet results()}
    <CaptureResults captures={found.captures} {books} covers={view.covers} {query} />
  {/snippet}
</LibraryScreen>
