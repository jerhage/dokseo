<script lang="ts">
  import { onMount } from 'svelte';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import { LibraryBooks } from '$lib/domains/library/ui/library-books.svelte';
  import ManageTagsScreen from '$lib/domains/recognition/ui/tag/ManageTagsScreen.svelte';
  import { ManageTagsView } from '$lib/domains/recognition/ui/tag/manage-tags.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const shelf = new LibraryBooks(container);
  const view = new TagView(
    container,
    () => ({ books: shelf.searchedBooks, wanted: null }),
    comparePassages,
  );
  const manage = new ManageTagsView(container, notify, () => view.load());

  onMount(() => {
    void shelf.load();
    void view.load();
    return () => shelf.dispose();
  });
</script>

<ManageTagsScreen {view} {manage} />
