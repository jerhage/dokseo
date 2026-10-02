<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import TagPageData from '$lib/domains/recognition/ui/tag/TagPageData.svelte';
  import UnreadableCaptures from '$lib/domains/recognition/ui/capture/UnreadableCaptures.svelte';
  import TagScreen from '$lib/domains/recognition/ui/tag/TagScreen.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { readTagName, TAG_PARAMETER } from '$lib/shared/tag-location';

  const container = useContainer();
  let shelf = $state<ReturnType<typeof LibraryShelfData> | null>(null);
  let tagged = $state<ReturnType<typeof TagPageData> | null>(null);
  const wanted = $derived(readTagName(page.url.searchParams.get(TAG_PARAMETER)));
  const view = new TagView(
    () => ({ books: shelf?.read().searched ?? [], wanted, tagged: tagged?.read() ?? null }),
    comparePassages,
  );
</script>

<LibraryShelfData bind:this={shelf} library={container.library}>
  {#snippet children(read)}
    <TagPageData bind:this={tagged} recognition={container.recognition}>
      <TagScreen
        {view}
        covers={read.covers}
        libraryFailure={read.failure}
        onretrylibrary={read.reload}
      >
        {#snippet notice()}
          <UnreadableCaptures
            captures={tagged?.unreadableRows() ?? []}
            recognition={container.recognition}
          />
        {/snippet}
      </TagScreen>
    </TagPageData>
  {/snippet}
</LibraryShelfData>
