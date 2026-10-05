<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLDivElement> & {
    label: string;
    overflow?: number;
  };

  let { label, overflow = 0, class: className, children, ...rest }: Props = $props();
</script>

<div {...rest} role="group" aria-label={label} class={['avatar-stack', className]}>
  {@render children?.()}
  {#if overflow > 0}
    <span class="avatar avatar-overflow" aria-hidden="true">+{overflow}</span>
  {/if}
</div>
