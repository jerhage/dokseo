<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import TagScreen from '$lib/domains/recognition/ui/tag/TagScreen.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import { readTagName, TAG_PARAMETER } from '$lib/shared/tag-location';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const shelf = new LibraryView(container, toastNotify(getToaster()));
  const books = $derived(
    shelf.books.map((book) => ({
      id: book.id,
      title: book.title,
      language: book.language,
      direction: effectiveDirection(book.direction, book.layoutKind),
    })),
  );
  const wanted = $derived(readTagName(page.url.searchParams.get(TAG_PARAMETER)));
  const view = new TagView(container, () => ({ books, wanted }));

  onMount(() => {
    void shelf.load();
    void view.load();
    return () => shelf.dispose();
  });
</script>

<TagScreen {view} covers={shelf.covers} {shelf} />
