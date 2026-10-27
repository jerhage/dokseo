<script lang="ts">
  import { page } from '$app/state';
  import { useContainer } from '$lib/context';
  import ReadBook from './ReadBook.svelte';
  import ReadTarget from './ReadTarget.svelte';

  const container = useContainer();
</script>

<ReadTarget {container} parameter={page.params.fileId ?? ''}>
  {#snippet opened(book)}
    <ReadBook {book} />
  {/snippet}
</ReadTarget>
