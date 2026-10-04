<script lang="ts">
  import type { Snippet } from 'svelte';
  import { anchorSlug } from '$lib/components/table-of-contents';

  type Props = {
    title: string;
    children: Snippet;
  };

  let { title, children }: Props = $props();

  const id = $derived(anchorSlug(title));
</script>

<section class="stack-md" aria-labelledby={id}>
  <h2 {id}>{title}</h2>
  {@render children()}
</section>
