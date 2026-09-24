<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLTableAttributes } from 'svelte/elements';

  type Props = HTMLTableAttributes & {
    striped?: boolean;
    compact?: boolean;
    caption?: string | Snippet;
  };

  let {
    striped = false,
    compact = false,
    caption,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<div class="table-wrapper">
  <table
    {...rest}
    class={['table', { 'table-striped': striped, 'table-compact': compact }, className]}
  >
    {#if typeof caption === 'string'}
      <caption>{caption}</caption>
    {:else if caption !== undefined}
      <caption>{@render caption()}</caption>
    {/if}
    {@render children?.()}
  </table>
</div>
