<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
    children: Snippet;
    title?: Snippet | undefined;
    actions?: Snippet | undefined;
    caption?: Snippet | undefined;
  };

  let { children, title, actions, caption, class: className, ...rest }: Props = $props();
</script>

<figure {...rest} class={['figure', className]}>
  {#if title !== undefined || actions !== undefined}
    <div class="figure-header">
      {#if title !== undefined}
        <span class="figure-title eyebrow">{@render title()}</span>
      {/if}
      {#if actions !== undefined}
        <div class="figure-actions">{@render actions()}</div>
      {/if}
    </div>
  {/if}
  <div class="figure-body">{@render children()}</div>
  {#if caption !== undefined}
    <figcaption class="figure-caption">{@render caption()}</figcaption>
  {/if}
</figure>
