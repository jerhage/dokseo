<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { CARD_SIZES, CARD_VARIANTS, MEDIA_RATIOS } from './classes';
  import type { CardSize, CardVariant, MediaRatio } from './classes';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'title' | 'onclick'> & {
    variant?: CardVariant;
    size?: CardSize;
    href?: string | undefined;
    onclick?: ((event: MouseEvent) => void) | undefined;
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
    onclick,
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

  const form = $derived(href !== undefined ? 'link' : onclick !== undefined ? 'button' : 'article');
  const tag = $derived(form === 'link' ? 'a' : form === 'button' ? 'button' : 'article');
  const block = $derived(form === 'button' ? 'span' : 'div');
  const titleTag = $derived(form === 'button' ? 'span' : heading);
  const descriptionTag = $derived(form === 'button' ? 'span' : 'p');

  const hasBody = $derived(
    eyebrow !== undefined ||
      title !== undefined ||
      description !== undefined ||
      children !== undefined,
  );

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
  this={tag}
  {...rest}
  {href}
  {onclick}
  type={form === 'button' ? 'button' : undefined}
  title={tooltip}
  class={[
    'card',
    CARD_VARIANTS[variant],
    CARD_SIZES[size],
    { 'card-interactive': form !== 'article' },
    mediaOnly && ['card-cover', MEDIA_RATIOS[mediaRatio]],
    className,
  ]}
>
  {#if mediaOnly}
    {@render media?.()}
  {:else}
    {#if media}
      <svelte:element this={block} class={['card-media', MEDIA_RATIOS[mediaRatio]]}
        >{@render media()}</svelte:element
      >
    {/if}
    {#if hasBody}
      <svelte:element this={block} class="card-body">
        {#if eyebrow}
          <span class="card-eyebrow eyebrow">{@render eyebrow()}</span>
        {/if}
        {#if title}
          <svelte:element this={titleTag} class="card-title">{@render title()}</svelte:element>
        {/if}
        {#if description}
          <svelte:element this={descriptionTag} class="card-description"
            >{@render description()}</svelte:element
          >
        {/if}
        {@render children?.()}
      </svelte:element>
    {/if}
    {#if footer}
      <svelte:element this={block} class="card-footer">{@render footer()}</svelte:element>
    {/if}
  {/if}
</svelte:element>
