<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  type Props = HTMLAnchorAttributes & {
    href: string;
    current?: boolean;
    strong?: boolean;
    icon?: Snippet;
    ref?: HTMLAnchorElement | null | undefined;
  };

  let {
    href,
    current = false,
    strong = false,
    icon,
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<a
  {...rest}
  bind:this={ref}
  {href}
  aria-current={current ? 'page' : undefined}
  class={['nav-link', { 'nav-link-strong': strong, 'is-active': current }, className]}
>
  {#if icon}
    <span aria-hidden="true">{@render icon()}</span>
  {/if}
  {@render children?.()}
</a>
