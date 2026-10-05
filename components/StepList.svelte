<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLOlAttributes } from 'svelte/elements';

  type Props = Omit<HTMLOlAttributes, 'children'> & {
    children: Snippet;
  };

  let { children, class: className, ...rest }: Props = $props();
</script>

<ol {...rest} class={['step-list', className]}>
  {@render children()}
</ol>
