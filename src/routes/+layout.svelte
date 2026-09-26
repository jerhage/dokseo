<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import { setToaster } from '$lib/components/toast-context';
  import { createToaster } from '$lib/components/toaster.svelte';
  import { buildContainer } from '$lib/container';
  import { provideContainer } from '$lib/context';
  import '$lib/styles/index.css';

  let { children } = $props();

  provideContainer(buildContainer());
  setToaster(createToaster());
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<ToastRegion />
