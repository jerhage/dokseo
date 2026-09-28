<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import ListGroup from '$lib/components/ListGroup.svelte';
  import ListRow from '$lib/components/ListRow.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import type { StorageSettingsView } from './storage-view.svelte';
  import StorageBreakdown from './StorageBreakdown.svelte';
  import StorageSummary from './StorageSummary.svelte';
  import { screenState } from './storage-overview';
  import type { StorageScreenState } from './storage-overview';

  type Props = { readonly view: StorageSettingsView; readonly engineHref?: string };

  let { view, engineHref = '/settings' }: Props = $props();

  const state: StorageScreenState = $derived(screenState(view.account, view.message));
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Storage</h1>
    <p class="text-sm text-muted">
      Everything this app keeps on this device, largest first. The parts are added up, then compared
      with the total the browser reports, so whatever they do not explain is named rather than
      hidden.
    </p>
  </header>

  {#if state.kind === 'reading'}
    <div class="surface bordered rounded-container col gap-3 p-5" aria-busy="true">
      <p class="text-sm text-muted" aria-live="polite">Reading what is stored…</p>
      <Skeleton shape="title" width="40%" />
      <Skeleton shape="text" />
      <Skeleton shape="text" width="70%" />
    </div>
  {:else if state.kind === 'failed'}
    <Alert variant="danger" title="Storage could not be read">{state.message}</Alert>
  {:else if state.kind === 'ready'}
    <StorageSummary account={state.account} />
    <StorageBreakdown account={state.account} />
  {/if}

  <ListGroup title="Free up space">
    <ListRow title="Books" description="Books are removed from your library.">
      {#snippet actions()}
        <Button href="/" size="sm" variant="outline">Open your library</Button>
      {/snippet}
    </ListRow>
    <ListRow title="Recognition model" description="The model is removed on the OCR engine page.">
      {#snippet actions()}
        <Button href={engineHref} size="sm" variant="outline">OCR engine</Button>
      {/snippet}
    </ListRow>
  </ListGroup>
</div>
