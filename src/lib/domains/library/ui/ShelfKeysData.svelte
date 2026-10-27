<script lang="ts">
  import type { Snippet } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import type { ShelfEntry, UnreadableEntry } from '$lib/shared/reader-target';
  import { booksQuery } from '../queries/library-queries';
  import type { LibraryReads } from '../queries/library-queries';
  import { shelfKeysOf } from './shelf-keys';

  type Props = {
    readonly library: Pick<LibraryReads, 'listBooks'>;
    readonly children: Snippet<[readonly ShelfEntry[], readonly UnreadableEntry[]]>;
  };

  let { library, children }: Props = $props();

  const listing = readQuery(() => booksQuery(library));
  const keys = $derived(shelfKeysOf(listing.state));
</script>

{#if keys.kind === 'loading'}
  <EmptyState variant="fill" live message="Reading your library…" />
{:else if keys.kind === 'failed'}
  <Alert variant="danger" title="Your library could not be read.">
    {keys.message}
    {#snippet actions()}
      <Button size="sm" onclick={() => listing.reload()}>Try again</Button>
    {/snippet}
  </Alert>
{:else}
  {@render children(keys.entries, keys.unreadable)}
{/if}
