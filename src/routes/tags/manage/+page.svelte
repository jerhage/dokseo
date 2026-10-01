<script lang="ts">
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import ManageTagsScreen from '$lib/domains/recognition/ui/tag/ManageTagsScreen.svelte';
  import { ManageTagsView } from '$lib/domains/recognition/ui/tag/manage-tags.svelte';
  import TagPageData from '$lib/domains/recognition/ui/tag/TagPageData.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  let shelf = $state<ReturnType<typeof LibraryShelfData> | null>(null);
  let tagged = $state<ReturnType<typeof TagPageData> | null>(null);
  const view = new TagView(
    () => ({ books: shelf?.read().searched ?? [], wanted: null, tagged: tagged?.read() ?? null }),
    comparePassages,
  );
  const manage = new ManageTagsView(container.recognition, notify);
</script>

<LibraryShelfData bind:this={shelf} library={container.library}>
  {#snippet children()}
    <TagPageData bind:this={tagged} recognition={container.recognition}>
      <ManageTagsScreen {view} {manage} />
    </TagPageData>
  {/snippet}
</LibraryShelfData>
