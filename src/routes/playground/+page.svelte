<script lang="ts">
  import type { Component } from 'svelte';
  import Divider from '$lib/components/Divider.svelte';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import { setToaster } from '$lib/components/toast-context';
  import { createToaster } from '$lib/components/toaster.svelte';
  import BadgesSection from './BadgesSection.svelte';
  import ButtonsSection from './ButtonsSection.svelte';
  import CardSection from './CardSection.svelte';
  import ChoicesSection from './ChoicesSection.svelte';
  import FormSection from './FormSection.svelte';
  import PlaygroundHeader from './PlaygroundHeader.svelte';
  import PlaygroundIntro from './PlaygroundIntro.svelte';
  import TokensSection from './TokensSection.svelte';

  const SECTIONS: readonly Component[] = [
    TokensSection,
    ButtonsSection,
    BadgesSection,
    FormSection,
    ChoicesSection,
    CardSection,
  ];

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
