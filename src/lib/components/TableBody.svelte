<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLTableSectionElement>;

  let { children, ...rest }: Props = $props();
</script>

<tbody {...rest}>
  {@render children?.()}
</tbody>
