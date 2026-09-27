<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { TAG_COLOUR_CLASSES } from './classes';
  import type { TagColour } from './classes';
  import X from './icons/X.svelte';

  type Form =
    | { href?: undefined; onremove?: undefined; removeLabel?: undefined }
    | { href?: undefined; onremove: () => void; removeLabel: string }
    | { href: string; onremove?: undefined; removeLabel?: undefined };

  type Props = HTMLAttributes<HTMLElement> & Form & { colour?: TagColour };

  let {
    href,
    onremove,
    removeLabel,
    colour,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<svelte:element
  this={href === undefined ? 'span' : 'a'}
  {...rest}
  {href}
  class={['tag', colour === undefined ? [] : TAG_COLOUR_CLASSES[colour], className]}
>
  {@render children?.()}
  {#if onremove !== undefined}
    <button type="button" class="tag-remove" aria-label={removeLabel} onclick={onremove}>
      <X class="tag-remove-icon" />
    </button>
  {/if}
</svelte:element>
