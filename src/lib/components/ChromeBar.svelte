<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { CHROME_BAR_EDGES } from './chrome-bar';
  import type { ChromeBarEdge } from './chrome-bar';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'inert'> & {
    edge: ChromeBarEdge;
    shown: boolean;
    height?: number;
    ref?: HTMLElement | null | undefined;
  };

  let {
    edge,
    shown,
    height = $bindable(0),
    ref = $bindable(),
    class: className,
    children,
    ...rest
  }: Props = $props();

  const shape = $derived(CHROME_BAR_EDGES[edge]);
</script>

<svelte:element
  this={shape.element}
  {...rest}
  class={['chrome-bar', shape.classes, 'hushable', { 'is-hushed': !shown }, className]}
  inert={!shown}
  bind:this={ref}
  bind:offsetHeight={height}
>
  {@render children?.()}
</svelte:element>
