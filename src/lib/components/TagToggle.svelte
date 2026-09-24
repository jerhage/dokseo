<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = Omit<HTMLButtonAttributes, 'type' | 'aria-pressed'> & {
    pressed?: boolean;
    onpressedchange?: (pressed: boolean) => void;
    ref?: HTMLButtonElement | undefined;
  };

  let {
    pressed = $bindable(false),
    onpressedchange,
    ref = $bindable(),
    onclick,
    class: className,
    children,
    ...rest
  }: Props = $props();

  function toggle(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    onclick?.(event);
    if (event.defaultPrevented) return;
    pressed = !pressed;
    onpressedchange?.(pressed);
  }
</script>

<button
  {...rest}
  bind:this={ref}
  type="button"
  aria-pressed={pressed}
  class={['tag', { 'is-active': pressed }, className]}
  onclick={toggle}
>
  {@render children?.()}
</button>
