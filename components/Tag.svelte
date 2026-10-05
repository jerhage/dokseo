<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { TAG_COLOUR_CLASSES } from './classes';
  import type { TagColour } from '../core/tag-colours.js';
  import X from './icons/X.svelte';

  type Form =
    | { href?: undefined; onremove?: undefined; removeLabel?: undefined }
    | { href?: undefined; onremove: () => void; removeLabel: string }
    | { href: string; onremove?: undefined; removeLabel?: undefined };

  type Props = HTMLAttributes<HTMLElement> & Form & { color?: TagColour };

  let { href, onremove, removeLabel, color, class: className, children, ...rest }: Props = $props();
</script>

<svelte:element
  this={href === undefined ? 'span' : 'a'}
  {...rest}
  {href}
  class={['tag', color === undefined ? [] : TAG_COLOUR_CLASSES[color], className]}
>
  {@render children?.()}
  {#if onremove !== undefined}
    <button type="button" class="tag-remove" aria-label={removeLabel} onclick={onremove}>
      <X class="close-icon close-icon-sm" />
    </button>
  {/if}
</svelte:element>
