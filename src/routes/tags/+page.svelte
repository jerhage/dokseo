<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import TagPageData from '$lib/domains/recognition/ui/tag/TagPageData.svelte';
  import UnreadableCaptures from '$lib/domains/recognition/ui/capture/UnreadableCaptures.svelte';
  import UnreadableTags from '$lib/domains/recognition/ui/tag/UnreadableTags.svelte';
  import TagScreen from '$lib/domains/recognition/ui/tag/TagScreen.svelte';
  import PageTitle from '$lib/shared/PageTitle.svelte';
  import { readTagName, TAG_PARAMETER } from '$lib/shared/tag-location';

  const container = useContainer();
  const wanted = $derived(readTagName(page.url.searchParams.get(TAG_PARAMETER)));
</script>

<PageTitle screen="Tags" section={wanted} />

<LibraryShelfData library={container.library}>
  {#snippet children(read)}
    <TagPageData recognition={container.recognition}>
      {#snippet children(tags)}
        <TagScreen
          tagged={tags.tagged}
          books={read.searched}
          {wanted}
          passages={comparePassages}
          covers={read.covers}
          libraryFailure={read.failure}
          onretrylibrary={read.reload}
        >
          {#snippet notice()}
            <UnreadableCaptures
              captures={tags.unreadableCaptures}
              recognition={container.recognition}
            />
            <UnreadableTags tags={tags.unreadableTags} recognition={container.recognition} />
          {/snippet}
        </TagScreen>
      {/snippet}
    </TagPageData>
  {/snippet}
</LibraryShelfData>
