<script lang="ts">
  import type { Snippet } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import Skeleton from '$lib/ui/components/Skeleton.svelte';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { unreachable } from '$lib/shared/unreachable';
  import type { StorageAccount } from '../domain/storage-parts';
  import { storageAccountQuery } from '../queries/storage-queries';
  import type { StorageReads } from '../queries/storage-queries';

  type Props = {
    readonly storage: StorageReads;
    readonly children: Snippet<[StorageAccount]>;
  };

  let { storage, children }: Props = $props();

  const account = readQuery(() => storageAccountQuery(storage));
  const state = $derived(account.state);
</script>

{#if state.kind === 'loading'}
  <div class="surface bordered rounded-container col gap-3 p-5" aria-busy="true">
    <EmptyState live message="Reading what is stored…" />
    <Skeleton shape="title" width="40%" />
    <Skeleton shape="text" />
    <Skeleton shape="text" width="70%" />
  </div>
{:else if state.kind === 'failed'}
  <Alert variant="danger" title="Storage could not be read">{state.message}</Alert>
{:else if state.kind === 'ready'}
  {@render children(state.value)}
{:else}
  {unreachable(state)}
{/if}
