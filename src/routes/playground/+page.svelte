<script lang="ts">
  import type { Component } from 'svelte';
  import Divider from '$lib/components/Divider.svelte';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import { setToaster } from '$lib/components/toast-context';
  import { createToaster } from '$lib/components/toaster.svelte';
  import PlaygroundHeader from './PlaygroundHeader.svelte';
  import PlaygroundIntro from './PlaygroundIntro.svelte';

  const SECTIONS: readonly Component[] = [];

  setToaster(createToaster());
</script>

<svelte:head>
  <title>Component library</title>
</svelte:head>

<PlaygroundHeader />
<main class="page-wrap">
  <div class="stack-lg">
    <PlaygroundIntro />
    {#each SECTIONS as Section, index (index)}
      <Divider />
      <Section />
    {/each}
    <Divider />
  </div>
</main>
<ToastRegion />
