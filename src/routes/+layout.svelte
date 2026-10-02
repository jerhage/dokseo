<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { dev } from '$app/environment';
  import favicon from '$lib/assets/favicon.svg';
  import Button from '$lib/components/Button.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import { setToaster } from '$lib/components/toast-context';
  import { createToaster } from '$lib/components/toaster.svelte';
  import { buildContainer } from '$lib/container';
  import { provideContainer } from '$lib/context';
  import { createQueryClient } from '$lib/query-client';
  import {
    UnexpectedFailures,
    logUnexpected,
    unexpectedMessage,
  } from '$lib/shared/unexpected-failure';
  import { watchShellUpdates } from '$lib/shared/shell-updates';
  import '$lib/styles/index.css';

  let { children } = $props();

  provideContainer(buildContainer());
  const toaster = createToaster();
  setToaster(toaster);
  const failures = new UnexpectedFailures(toaster);
  if (!dev) watchShellUpdates(toaster);

  const queryClient = createQueryClient();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<svelte:window
  onerror={(event) => failures.windowError(event)}
  onunhandledrejection={(event) => failures.raise('promise', event.reason)}
/>

<QueryClientProvider client={queryClient}>
  <svelte:boundary onerror={(error) => logUnexpected('render', error)}>
    {@render children()}

    {#snippet failed(error, reset)}
      <EmptyState variant="fill" live message={unexpectedMessage(error)} class="min-h-screen">
        {#snippet action()}
          <Button variant="primary" size="sm" onclick={reset}>Try again</Button>
        {/snippet}
      </EmptyState>
    {/snippet}
  </svelte:boundary>
</QueryClientProvider>

<ToastRegion />
