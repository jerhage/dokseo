<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import TagScreen from '$lib/domains/recognition/ui/tag/TagScreen.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import { readTagName, TAG_PARAMETER } from '$lib/shared/tag-location';

  const container = useContainer();
  const shelf = new LibraryView(container);
  const view = new TagView(container);

  $effect(() => {
    view.books = shelf.books.map((book) => ({
      id: book.id,
      title: book.title,
      language: book.language,
      direction: effectiveDirection(book.direction, book.layoutKind),
    }));
    view.wanted = readTagName(page.url.searchParams.get(TAG_PARAMETER));
  });

  $effect(() => {
    void shelf.load();
    void view.load();
    return () => shelf.dispose();
  });
</script>

<TagScreen {view} covers={shelf.covers} />
