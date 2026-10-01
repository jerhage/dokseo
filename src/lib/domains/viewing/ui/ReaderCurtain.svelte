<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { readerCurtain } from './reader-opening';
  import type { CurtainOpening } from './reader-opening';

  type Props = {
    readonly opening: CurtainOpening;
  };

  let { opening }: Props = $props();

  const message = $derived(readerCurtain(opening) ?? '');
</script>

<EmptyState variant="fill" live {message} class="flex-1 min-h-0 scheme-dark surface-sunken">
  {#snippet action()}
    {#if opening.kind === 'failed'}
      <Button href="/" variant="primary" size="sm">Back to your library</Button>
    {/if}
  {/snippet}
</EmptyState>
