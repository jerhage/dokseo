<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import type { Component } from 'svelte';
  import { createTestQueryClient } from './query-client';

  type Props = { readonly screen: Component };

  let { screen: Screen }: Props = $props();

  const client = createTestQueryClient();
</script>

<QueryClientProvider {client}>
  <Screen />
</QueryClientProvider>
