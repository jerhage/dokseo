<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLTableAttributes } from 'svelte/elements';
  import { TABLE_SIZES } from './classes';
  import type { TableSize } from './classes';

  type Props = HTMLTableAttributes & {
    striped?: boolean;
    size?: TableSize;
    caption?: string | Snippet;
  };

  let {
    striped = false,
    size = 'md',
    caption,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<div class="table-wrapper">
  <table {...rest} class={['table', { 'table-striped': striped }, TABLE_SIZES[size], className]}>
    {#if typeof caption === 'string'}
      <caption>{caption}</caption>
    {:else if caption !== undefined}
      <caption>{@render caption()}</caption>
    {/if}
    {@render children?.()}
  </table>
</div>
