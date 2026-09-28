<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { commandItemElement } from './command-item';

  type Form =
    | { href: string; element?: 'a' | 'div' }
    | { href?: undefined; element?: 'button' | 'div' };

  type Props = HTMLAttributes<HTMLElement> &
    Form & {
      selected?: boolean;
      hint?: string | undefined;
      ref?: HTMLElement | null | undefined;
    };

  let {
    href,
    element: chosen,
    selected = false,
    hint,
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();

  const element = $derived(commandItemElement(href, chosen));
  const plain = $derived(element === 'div');
</script>

<svelte:element
  this={element}
  {...rest}
  bind:this={ref}
  href={element === 'a' ? href : undefined}
  type={element === 'button' ? 'button' : undefined}
  class={['command-item', { 'command-item-static': plain, 'is-selected': selected }, className]}
>
  {@render children?.()}
  {#if hint !== undefined}
    <span class="command-item-hint">{hint}</span>
  {/if}
</svelte:element>
