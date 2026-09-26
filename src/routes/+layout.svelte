<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import { buildContainer } from '$lib/container';
  import { provideContainer } from '$lib/context';
  import '$lib/styles/index.css';

  let { children } = $props();

  provideContainer(buildContainer());
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
