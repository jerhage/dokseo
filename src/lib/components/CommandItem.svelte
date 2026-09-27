<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { commandItemElement } from './command-item';

  type Props = HTMLAttributes<HTMLElement> & {
    href?: string | undefined;
    interactive?: boolean;
    selected?: boolean;
    hint?: string | undefined;
    ref?: HTMLElement | undefined;
  };

  let {
    href,
    interactive = true,
    selected = false,
    hint,
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();

  const element = $derived(commandItemElement(href, interactive));
</script>

<svelte:element
  this={element}
  {...rest}
  bind:this={ref}
  href={element === 'a' ? href : undefined}
  type={element === 'button' ? 'button' : undefined}
  class={[
    'command-item',
    { 'command-item-static': !interactive, 'is-selected': selected },
    className,
  ]}
>
  {@render children?.()}
  {#if hint !== undefined}
    <span class="command-item-hint">{hint}</span>
  {/if}
</svelte:element>
