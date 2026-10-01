<script lang="ts">
  import type { Snippet } from 'svelte';
  import Alert from '$lib/components/Alert.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import type { ReadState } from '$lib/shared/read-state';
  import { unreachable } from '$lib/shared/unreachable';
  import type { StorageAccount } from '../domain/storage-parts';

  type Props = {
    readonly state: ReadState<StorageAccount>;
    readonly children: Snippet<[StorageAccount]>;
  };

  let { state, children }: Props = $props();
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
