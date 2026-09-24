<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { AVATAR_SHAPES, AVATAR_SIZES, AVATAR_VARIANTS } from './classes';
  import type { AvatarShape, AvatarVariant, ControlSize } from './classes';

  type Props = HTMLAttributes<HTMLSpanElement> & {
    size?: ControlSize;
    shape?: AvatarShape;
    variant?: AvatarVariant;
    src?: string | undefined;
    alt?: string;
  };

  let {
    size = 'md',
    shape = 'circle',
    variant = 'brand',
    src,
    alt = '',
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<span
  {...rest}
  class={['avatar', AVATAR_SIZES[size], AVATAR_SHAPES[shape], AVATAR_VARIANTS[variant], className]}
>
  {#if src === undefined}
    {@render children?.()}
  {:else}
    <img {src} {alt} />
  {/if}
</span>
