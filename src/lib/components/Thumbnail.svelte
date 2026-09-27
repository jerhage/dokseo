<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { MediaRatio } from './classes';
  import { THUMBNAIL_SIZES, thumbnailContent, thumbnailRatio } from './thumbnail';

  type Framing =
    | { size?: 'sm' | 'md' | 'lg'; ratio?: MediaRatio }
    | { size: 'fill'; ratio?: never };

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'role'> &
    Framing & {
      src: string | null;
      alt?: string;
      bordered?: boolean;
    };

  let {
    src,
    alt = '',
    size = 'md',
    ratio = 'portrait',
    bordered = false,
    class: className,
    ...rest
  }: Props = $props();

  const content = $derived(thumbnailContent(src, alt));
</script>

<span
  {...rest}
  class={[
    'thumbnail',
    THUMBNAIL_SIZES[size],
    thumbnailRatio(size, ratio),
    { 'thumbnail-bordered': bordered },
    className,
  ]}
  role={content.kind === 'named' ? 'img' : undefined}
  aria-label={content.kind === 'named' ? content.label : undefined}
>
  {#if content.kind === 'image'}
    <img src={content.src} alt={content.alt} />
  {/if}
</span>
