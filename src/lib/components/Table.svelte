<script lang="ts">
  import type { HTMLTableAttributes } from 'svelte/elements';

  type Props = HTMLTableAttributes & {
    striped?: boolean;
    compact?: boolean;
  };

  let { striped = false, compact = false, class: className, children, ...rest }: Props = $props();
</script>

<div class="table-wrapper">
  <table
    {...rest}
    class={['table', { 'table-striped': striped, 'table-compact': compact }, className]}
  >
    {@render children?.()}
  </table>
</div>
