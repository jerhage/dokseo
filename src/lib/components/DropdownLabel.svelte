<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLSpanElement>;

  let { class: className, children, ...rest }: Props = $props();
</script>

<span {...rest} role="presentation" class={['dropdown-label', className]}>
  {@render children?.()}
</span>
