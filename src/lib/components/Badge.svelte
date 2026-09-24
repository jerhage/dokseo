<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { BADGE_COLOUR_CLASSES, BADGE_VARIANTS } from './classes';
  import type { BadgeVariant, TagColour } from './classes';

  type Tone =
    | { variant?: BadgeVariant; colour?: undefined }
    | { colour: TagColour; variant?: undefined };

  type Props = HTMLAttributes<HTMLSpanElement> &
    Tone & {
      dot?: boolean;
      solid?: boolean;
    };

  let {
    variant = 'neutral',
    colour,
    dot = false,
    solid = false,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const tone = $derived(
    colour === undefined ? BADGE_VARIANTS[variant] : BADGE_COLOUR_CLASSES[colour],
  );
</script>

<span {...rest} class={['badge', tone, { 'badge-dot': dot, 'badge-solid': solid }, className]}>
  {@render children?.()}
</span>
