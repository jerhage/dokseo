<script lang="ts">
  import type { HTMLTdAttributes } from 'svelte/elements';

  type Props = HTMLTdAttributes & {
    numeric?: boolean;
    actions?: boolean;
  };

  let { numeric = false, actions = false, class: className, children, ...rest }: Props = $props();
</script>

<td {...rest} class={[{ 'table-numeric': numeric, 'table-actions': actions }, className]}>
  {@render children?.()}
</td>
