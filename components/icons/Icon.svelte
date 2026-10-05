<script lang="ts">
  import { ICON_GRID, iconStroke, isDecorative } from './icon';
  import type { IconNode, IconProps } from './icon';

  type Props = IconProps & {
    name: string;
    iconNode: IconNode;
  };

  let {
    name,
    iconNode,
    size = ICON_GRID,
    color = 'currentColor',
    strokeWidth,
    absoluteStrokeWidth = false,
    nonScalingStroke = false,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const stroke = $derived(iconStroke(strokeWidth, absoluteStrokeWidth, size));
  const decorative = $derived(isDecorative(rest, children !== undefined));
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 {ICON_GRID} {ICON_GRID}"
  fill="none"
  stroke={color}
  stroke-width={stroke.width}
  stroke-linecap="round"
  stroke-linejoin="round"
  data-fixed-stroke={stroke.fixed ? '' : undefined}
  aria-hidden={decorative ? 'true' : undefined}
  {...rest}
  class={['lucide', `lucide-${name}`, className]}
>
  {#each iconNode as [element, attributes], index (index)}
    <svelte:element
      this={element}
      vector-effect={nonScalingStroke ? 'non-scaling-stroke' : undefined}
      {...attributes}
    />
  {/each}
  {@render children?.()}
</svg>
