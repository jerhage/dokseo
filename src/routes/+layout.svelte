<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import favicon from '$lib/assets/favicon.svg';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import { setToaster } from '$lib/components/toast-context';
  import { createToaster } from '$lib/components/toaster.svelte';
  import { buildContainer } from '$lib/container';
  import { provideContainer } from '$lib/context';
  import { createQueryClient } from '$lib/query-client';
  import '$lib/styles/index.css';

  let { children } = $props();

  provideContainer(buildContainer());
  setToaster(createToaster());

  const queryClient = createQueryClient();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>

<ToastRegion />
