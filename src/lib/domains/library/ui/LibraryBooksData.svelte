<script lang="ts">
  import type { Snippet } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import type { ReadState } from '$lib/shared/read-state';
  import { unreachable } from '$lib/shared/unreachable';
  import { DROP_INVITATION } from './accepted-formats';
  import { failureOf, libraryBody, shelfOf } from './library-shelf';
  import type { LibraryShelf } from './library-shelf';

  type Props = {
    readonly state: ReadState<LibraryShelf>;
    readonly importing: boolean;
    readonly onretry: () => void;
    readonly children: Snippet<[LibraryShelf]>;
  };

  let { state, importing, onretry, children }: Props = $props();

  const body = $derived(libraryBody(state, importing));
  const shelf = $derived(shelfOf(state));
  const failure = $derived(failureOf(state));
</script>

{#if body === 'reading'}
  <EmptyState live message="Reading your library…" />
{:else if body === 'failed'}
  <Alert variant="danger" title="Your library could not be read.">
    {#if failure !== null}
      {failure}
    {/if}
    {#snippet actions()}
      <Button size="sm" onclick={onretry}>Try again</Button>
    {/snippet}
  </Alert>
  {@render children(shelf)}
{:else if body === 'empty'}
  <EmptyState message="No uploads yet. {DROP_INVITATION.toLowerCase()} to start." />
  {@render children(shelf)}
{:else if body === 'listed'}
  {@render children(shelf)}
{:else}
  {unreachable(body)}
{/if}
