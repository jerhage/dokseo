<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLElement> & {
    href?: string | undefined;
    selected?: boolean;
    hint?: string | undefined;
    ref?: HTMLElement | undefined;
  };

  let {
    href,
    selected = false,
    hint,
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<svelte:element
  this={href === undefined ? 'button' : 'a'}
  {...rest}
  bind:this={ref}
  {href}
  type={href === undefined ? 'button' : undefined}
  class={['command-item', { 'is-selected': selected }, className]}
>
  {@render children?.()}
  {#if hint !== undefined}
    <span class="command-item-hint">{hint}</span>
  {/if}
</svelte:element>
