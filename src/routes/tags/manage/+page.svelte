<script lang="ts">
  import { useContainer } from '$lib/context';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import ManageTagsScreen from '$lib/domains/recognition/ui/tag/ManageTagsScreen.svelte';
  import { ManageTagsView } from '$lib/domains/recognition/ui/tag/manage-tags.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';

  const container = useContainer();
  const shelf = new LibraryView(container);
  const view = new TagView(container);
  const manage = new ManageTagsView(container, () => view.load());

  $effect(() => {
    view.books = shelf.books.map((book) => ({
      id: book.id,
      title: book.title,
      language: book.language,
      direction: effectiveDirection(book.direction, book.layoutKind),
    }));
  });

  $effect(() => {
    void shelf.load();
    void view.load();
    return () => shelf.dispose();
  });
</script>

<ManageTagsScreen {view} {manage} />
