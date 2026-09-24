<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { TAG_COLOUR_CLASSES } from './classes';
  import type { TagColour } from './classes';

  type Removal =
    | { onremove?: undefined; removeLabel?: undefined }
    | { onremove: () => void; removeLabel: string };

  type Props = HTMLAttributes<HTMLSpanElement> & Removal & { colour?: TagColour };

  let { onremove, removeLabel, colour, class: className, children, ...rest }: Props = $props();
</script>

<span {...rest} class={['tag', colour === undefined ? [] : TAG_COLOUR_CLASSES[colour], className]}>
  {@render children?.()}
  {#if onremove !== undefined}
    <button type="button" class="tag-remove" aria-label={removeLabel} onclick={onremove}></button>
  {/if}
</span>
