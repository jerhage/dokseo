<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import { LibraryBooks } from '$lib/domains/library/ui/library-books.svelte';
  import TagScreen from '$lib/domains/recognition/ui/tag/TagScreen.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { readTagName, TAG_PARAMETER } from '$lib/shared/tag-location';

  const container = useContainer();
  const shelf = new LibraryBooks(container);
  const wanted = $derived(readTagName(page.url.searchParams.get(TAG_PARAMETER)));
  const view = new TagView(
    container,
    () => ({ books: shelf.searchedBooks, wanted }),
    comparePassages,
  );

  onMount(() => {
    void shelf.load();
    void view.load();
    return () => shelf.dispose();
  });
</script>

<TagScreen
  {view}
  covers={shelf.covers}
  libraryFailure={shelf.failure}
  onretrylibrary={() => void shelf.load()}
/>
