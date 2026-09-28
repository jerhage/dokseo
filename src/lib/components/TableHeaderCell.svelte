<script lang="ts">
  import type { HTMLThAttributes } from 'svelte/elements';

  type Props = HTMLThAttributes & {
    numeric?: boolean;
  };

  let { numeric = false, class: className, children, ...rest }: Props = $props();
</script>

<th {...rest} class={['eyebrow', { 'table-numeric': numeric }, className]}>
  {@render children?.()}
</th>
