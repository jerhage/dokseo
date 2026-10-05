<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { BADGE_COLOUR_CLASSES, BADGE_EMPHASES, BADGE_VARIANTS } from './classes';
  import type { TagColour } from '../core/tag-colours.js';
  import type { BadgeEmphasis, BadgeVariant } from './classes';

  type Tone =
    | { variant?: BadgeVariant; color?: undefined }
    | { color: TagColour; variant?: undefined };

  type Props = HTMLAttributes<HTMLSpanElement> &
    Tone & {
      dot?: boolean;
      emphasis?: BadgeEmphasis;
    };

  let {
    variant = 'neutral',
    color,
    dot = false,
    emphasis = 'tinted',
    class: className,
    children,
    ...rest
  }: Props = $props();

  const tone = $derived(
    color === undefined ? BADGE_VARIANTS[variant] : BADGE_COLOUR_CLASSES[color],
  );
</script>

<span {...rest} class={['badge', tone, { 'badge-dot': dot }, BADGE_EMPHASES[emphasis], className]}>
  {@render children?.()}
</span>
