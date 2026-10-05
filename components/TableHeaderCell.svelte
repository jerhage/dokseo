<script lang="ts">
  import type { HTMLThAttributes } from 'svelte/elements';

  type Props = HTMLThAttributes & {
    numeric?: boolean;
    actions?: boolean;
  };

  let { numeric = false, actions = false, class: className, children, ...rest }: Props = $props();
</script>

<th
  {...rest}
  class={['eyebrow', { 'table-numeric': numeric, 'table-actions': actions }, className]}
>
  {@render children?.()}
</th>
