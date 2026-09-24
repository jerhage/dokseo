<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Removal =
    | { onremove?: undefined; removeLabel?: undefined }
    | { onremove: () => void; removeLabel: string };

  type Props = HTMLAttributes<HTMLSpanElement> & Removal;

  let { onremove, removeLabel, class: className, children, ...rest }: Props = $props();
</script>

<span {...rest} class={['tag', className]}>
  {@render children?.()}
  {#if onremove !== undefined}
    <button type="button" class="tag-remove" aria-label={removeLabel} onclick={onremove}></button>
  {/if}
</span>
