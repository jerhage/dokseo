<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { CARD_SIZES, CARD_VARIANTS, MEDIA_RATIOS } from './classes';
  import type { CardSize, CardVariant, MediaRatio } from './classes';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
    variant?: CardVariant;
    size?: CardSize;
    href?: string | undefined;
    tooltip?: string | undefined;
    heading?: 'h2' | 'h3' | 'h4';
    media?: Snippet;
    mediaRatio?: MediaRatio;
    eyebrow?: Snippet;
    title?: Snippet;
    description?: Snippet;
    footer?: Snippet;
  };

  let {
    variant = 'default',
    size = 'md',
    href,
    tooltip,
    heading = 'h3',
    media,
    mediaRatio = 'video',
    eyebrow,
    title,
    description,
    footer,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const mediaOnly = $derived(
    media !== undefined &&
      eyebrow === undefined &&
      title === undefined &&
      description === undefined &&
      children === undefined &&
      footer === undefined,
  );
</script>

<svelte:element
  this={href === undefined ? 'article' : 'a'}
  {...rest}
  {href}
  title={tooltip}
  class={[
    'card',
    CARD_VARIANTS[variant],
    CARD_SIZES[size],
    { 'card-interactive': href !== undefined },
    mediaOnly && ['card-cover', MEDIA_RATIOS[mediaRatio]],
    className,
  ]}
>
  {#if mediaOnly}
    {@render media?.()}
  {:else}
    {#if media}
      <div class={['card-media', MEDIA_RATIOS[mediaRatio]]}>{@render media()}</div>
    {/if}
    <div class="card-body">
      {#if eyebrow}
        <span class="card-eyebrow eyebrow">{@render eyebrow()}</span>
      {/if}
      {#if title}
        <svelte:element this={heading} class="card-title">{@render title()}</svelte:element>
      {/if}
      {#if description}
        <p class="card-description">{@render description()}</p>
      {/if}
      {@render children?.()}
    </div>
    {#if footer}
      <div class="card-footer">{@render footer()}</div>
    {/if}
  {/if}
</svelte:element>
