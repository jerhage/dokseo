<script lang="ts">
  import type { Snippet } from 'svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import type { ReadState } from '$lib/shared/read-state';
  import { unreachable } from '$lib/shared/unreachable';
  import type { EngineChoice } from './engine-setup.svelte';

  type Props = {
    readonly state: ReadState<EngineChoice>;
    readonly onretry: () => void;
    readonly children: Snippet<[EngineChoice]>;
  };

  let { state, onretry, children }: Props = $props();
</script>

{#if state.kind === 'loading'}
  <div class="surface bordered rounded-container col gap-3 p-5" aria-busy="true">
    <EmptyState live message="Reading your engine settings…" />
    <Skeleton shape="title" width="40%" />
    <Skeleton shape="text" />
    <Skeleton shape="text" width="70%" />
  </div>
{:else if state.kind === 'failed'}
  <Alert variant="danger" title="Engine settings could not be read">
    {state.message}
    {#snippet actions()}
      <Button size="sm" onclick={onretry}>Try again</Button>
    {/snippet}
  </Alert>
{:else if state.kind === 'ready'}
  {@render children(state.value)}
{:else}
  {unreachable(state)}
{/if}
