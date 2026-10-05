<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLTableRowElement>;

  let { children, ...rest }: Props = $props();
</script>

<tr {...rest}>
  {@render children?.()}
</tr>
