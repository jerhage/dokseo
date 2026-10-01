<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ReaderOpening, ShownOpening } from './reader-opening';
  import ReaderCurtain from './ReaderCurtain.svelte';

  type Props = {
    readonly opening: ReaderOpening;
    readonly children: Snippet<[ShownOpening]>;
  };

  let { opening, children }: Props = $props();
</script>

{#if opening.kind === 'images'}
  {@render children(opening)}
{:else}
  <ReaderCurtain {opening} />
{/if}
