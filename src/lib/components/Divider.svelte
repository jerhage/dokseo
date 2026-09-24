<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLElement> & {
    strong?: boolean;
    vertical?: boolean;
  };

  let { strong = false, vertical = false, class: className, children, ...rest }: Props = $props();
</script>

{#if children}
  <div
    {...rest}
    role="separator"
    class={['divider', 'divider-labeled', { 'divider-strong': strong }, className]}
  >
    {@render children()}
  </div>
{:else}
  <hr
    {...rest}
    aria-orientation={vertical ? 'vertical' : undefined}
    class={['divider', { 'divider-strong': strong, 'divider-vertical': vertical }, className]}
  />
{/if}
