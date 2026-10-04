<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';

  type Props = Omit<HTMLLiAttributes, 'children' | 'title'> & {
    title: string;
    heading?: 'h3' | 'h4';
    children?: Snippet;
  };

  let { title, heading = 'h3', children, class: className, ...rest }: Props = $props();
</script>

<li {...rest} class={['step-list-item', className]}>
  <div class="step-list-content">
    <svelte:element this={heading} class="step-list-title">{title}</svelte:element>
    {#if children !== undefined}
      <div class="step-list-body">{@render children()}</div>
    {/if}
  </div>
</li>
