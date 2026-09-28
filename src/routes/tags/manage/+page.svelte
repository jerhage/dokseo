<script lang="ts">
  import { untrack } from 'svelte';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import { LibraryView } from '$lib/domains/library/ui/library-view.svelte';
  import ManageTagsScreen from '$lib/domains/recognition/ui/tag/ManageTagsScreen.svelte';
  import { ManageTagsView } from '$lib/domains/recognition/ui/tag/manage-tags.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { effectiveDirection } from '$lib/shared/layout-kind';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const shelf = new LibraryView(container, notify);
  const books = $derived(
    shelf.books.map((book) => ({
      id: book.id,
      title: book.title,
      language: book.language,
      direction: effectiveDirection(book.direction, book.layoutKind),
    })),
  );
  const view = new TagView(container, () => ({ books, wanted: null }));
  const manage = new ManageTagsView(container, notify, () => view.load());

  $effect(() => {
    untrack(() => {
      void shelf.load();
      void view.load();
    });
    return () => shelf.dispose();
  });
</script>

<ManageTagsScreen {view} {manage} />
