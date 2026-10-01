<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
  import LibraryShelfData from '$lib/domains/library/ui/LibraryShelfData.svelte';
  import TagScreen from '$lib/domains/recognition/ui/tag/TagScreen.svelte';
  import { TagView } from '$lib/domains/recognition/ui/tag/tag-view.svelte';
  import { readTagName, TAG_PARAMETER } from '$lib/shared/tag-location';

  const container = useContainer();
  let shelf = $state<ReturnType<typeof LibraryShelfData> | null>(null);
  const wanted = $derived(readTagName(page.url.searchParams.get(TAG_PARAMETER)));
  const view = new TagView(
    container,
    () => ({ books: shelf?.read().searched ?? [], wanted }),
    comparePassages,
  );

  onMount(() => {
    void view.load();
  });
</script>

<LibraryShelfData bind:this={shelf} library={container.library}>
  {#snippet children(read)}
    <TagScreen
      {view}
      covers={read.covers}
      libraryFailure={read.failure}
      onretrylibrary={read.reload}
    />
  {/snippet}
</LibraryShelfData>
