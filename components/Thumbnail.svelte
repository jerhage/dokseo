<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ControlSize, MediaRatio } from './classes';
  import { thumbnailContent, thumbnailFraming } from './thumbnail';

  type Framing =
    | { fill?: false; size?: ControlSize; ratio?: MediaRatio }
    | { fill: true; size?: never; ratio?: never };

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'role'> &
    Framing & {
      src: string | null;
      alt?: string;
      bordered?: boolean;
    };

  let {
    src,
    alt = '',
    fill = false,
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
    thumbnailFraming(fill, size, ratio),
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
