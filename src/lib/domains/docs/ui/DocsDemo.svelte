<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';

  type Props = {
    label?: string;
    resettable?: boolean;
    resetLabel?: string;
    controls?: Snippet;
    caption?: Snippet;
    children: Snippet;
  };

  let {
    label = 'Live demo',
    resettable = false,
    resetLabel = 'Reset',
    controls,
    caption,
    children,
  }: Props = $props();

  let run = $state(0);
</script>

{#snippet demoTitle()}{label}{/snippet}

{#snippet demoActions()}
  {@render controls?.()}
  {#if resettable}
    <Button size="sm" variant="ghost" onclick={() => (run += 1)}>{resetLabel}</Button>
  {/if}
{/snippet}

<Figure
  title={demoTitle}
  actions={controls !== undefined || resettable ? demoActions : undefined}
  {caption}
>
  {#key run}
    {@render children()}
  {/key}
</Figure>
