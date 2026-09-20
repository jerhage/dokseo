<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import LibraryScreen from '$lib/domains/library/ui/LibraryScreen.svelte';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import { MISSING_BOOK_PARAMETER, missingBookNotice } from '$lib/shared/reader-location';

  const view = new LibraryView(useContainer());
  const notice = $derived(missingBookNotice(page.url.searchParams.get(MISSING_BOOK_PARAMETER)));

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<LibraryScreen {view} {notice} />
