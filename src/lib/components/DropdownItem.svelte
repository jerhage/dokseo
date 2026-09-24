<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { useMenu } from './menu';

  type Props = Omit<HTMLButtonAttributes, 'type' | 'role'> & {
    danger?: boolean;
    selected?: boolean | undefined;
    shortcut?: string | undefined;
  };

  let {
    danger = false,
    selected,
    shortcut,
    onclick,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const menu = useMenu();

  function choose(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    onclick?.(event);
    if (!event.defaultPrevented) menu.close();
  }
</script>

<button
  {...rest}
  type="button"
  role={selected === undefined ? 'menuitem' : 'menuitemradio'}
  aria-checked={selected}
  tabindex="-1"
  class={[
    'dropdown-item',
    { 'dropdown-item-danger': danger, 'is-selected': selected === true },
    className,
  ]}
  onclick={choose}
>
  {@render children?.()}
  {#if shortcut !== undefined}
    <span class="dropdown-item-shortcut">{shortcut}</span>
  {/if}
</button>
