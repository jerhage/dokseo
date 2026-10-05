<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import { unreachable } from '$lib/shared/unreachable';
  import type { FlowCurtain } from './flow-view.svelte';

  type Props = {
    readonly curtain: FlowCurtain;
  };

  let { curtain }: Props = $props();
</script>

{#if curtain.kind === 'opening'}
  <EmptyState
    variant="fill"
    live
    message="Opening this book…"
    class="layout-overlay-fill z-overlay surface-bg text-center"
  />
{:else if curtain.kind === 'notice'}
  <EmptyState
    variant="fill"
    live
    message={curtain.message}
    class="layout-overlay-fill z-overlay surface-bg text-center"
  >
    {#snippet action()}
      <Button href="/" variant="primary" size="sm">Back to your library</Button>
    {/snippet}
  </EmptyState>
{:else if curtain.kind !== 'none'}
  {unreachable(curtain)}
{/if}
