<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { CARD_VARIANTS, MEDIA_RATIOS } from './classes';
  import type { CardVariant, MediaRatio } from './classes';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
    variant?: CardVariant;
    href?: string | undefined;
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
    href,
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
</script>

<svelte:element
  this={href === undefined ? 'article' : 'a'}
  {...rest}
  {href}
  class={['card', CARD_VARIANTS[variant], { 'card-interactive': href !== undefined }, className]}
>
  {#if media}
    <div class={['card-media', MEDIA_RATIOS[mediaRatio]]}>{@render media()}</div>
  {/if}
  <div class="card-body">
    {#if eyebrow}
      <span class="card-eyebrow">{@render eyebrow()}</span>
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
</svelte:element>
