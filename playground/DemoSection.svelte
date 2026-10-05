<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    id: string;
    title: string;
    classes: readonly string[];
    children: Snippet;
  };

  let { id, title, classes, children }: Props = $props();
</script>

<section {id} class="stack-md">
  <div class="row wrap items-center gap-3">
    <h2>{title}</h2>
    {#each classes as name (name)}
      <code>.{name}</code>
    {/each}
  </div>
  {@render children()}
</section>
