<script lang="ts">
  import { onMount } from 'svelte';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import ManageTagsScreen from '$lib/domains/recognition/ui/tag/ManageTagsScreen.svelte';
  import { ManageTagsView } from '$lib/domains/recognition/ui/tag/manage-tags.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  let shelf = $state<ReturnType<typeof LibraryShelfData> | null>(null);
  const view = new TagView(
    container,
    () => ({ books: shelf?.read().searched ?? [], wanted: null }),
    comparePassages,
  );
  const manage = new ManageTagsView(container, notify, () => view.load());

  onMount(() => {
    void view.load();
  });
</script>

<LibraryShelfData bind:this={shelf} library={container.library}>
  {#snippet children()}
    <ManageTagsScreen {view} {manage} />
  {/snippet}
</LibraryShelfData>
