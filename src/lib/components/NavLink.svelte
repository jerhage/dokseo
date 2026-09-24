<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  type Props = HTMLAnchorAttributes & {
    href: string;
    current?: boolean;
    icon?: Snippet;
  };

  let { href, current = false, icon, class: className, children, ...rest }: Props = $props();
</script>

<a
  {...rest}
  {href}
  aria-current={current ? 'page' : undefined}
  class={['nav-link', { 'is-active': current }, className]}
>
  {#if icon}
    <span aria-hidden="true">{@render icon()}</span>
  {/if}
  {@render children?.()}
</a>
