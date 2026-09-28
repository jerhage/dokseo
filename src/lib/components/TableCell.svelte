<script lang="ts">
  import type { HTMLTdAttributes } from 'svelte/elements';

  type Props = HTMLTdAttributes & {
    numeric?: boolean;
  };

  let { numeric = false, class: className, children, ...rest }: Props = $props();
</script>

<td {...rest} class={[{ 'table-numeric': numeric }, className]}>
  {@render children?.()}
</td>
