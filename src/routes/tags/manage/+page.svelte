<script lang="ts">
  import { getToaster } from '$lib/ui/components/toast-context';
  import { useContainer } from '$lib/context';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import ManageTagsScreen from '$lib/domains/recognition/ui/tag/ManageTagsScreen.svelte';
  import { ManageTags } from '$lib/domains/recognition/ui/tag/manage-tags.svelte';
  import TagPageData from '$lib/domains/recognition/ui/tag/TagPageData.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';
  import PageTitle from '$lib/shared/PageTitle.svelte';

  const container = useContainer();
  const notify = toastNotify(getToaster());
  const manage = new ManageTags(container.recognition, notify);
</script>

<PageTitle screen="Manage tags" />

<LibraryShelfData library={container.library}>
  {#snippet children(read)}
    <TagPageData recognition={container.recognition}>
      {#snippet children(tags)}
        <ManageTagsScreen tagged={tags.tagged} books={read.searched} {manage} />
      {/snippet}
    </TagPageData>
  {/snippet}
</LibraryShelfData>
