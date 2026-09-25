<script lang="ts">
  import type { StorageSettingsView } from '../../storage-view.svelte';
  import StorageAccountCard from './StorageAccountCard.svelte';

  type Props = { readonly view: StorageSettingsView; readonly engineHref?: string };

  let { view, engineHref = '/settings' }: Props = $props();

  const account = $derived(view.account);
</script>

<header class="col gap-1 px-responsive pt-5 pb-4 border-b">
  <h1 class="text-lg">Storage</h1>
  <p class="prose text-sm text-muted">
    Everything this app keeps on this device, part by part. The parts are added up, then compared
    with the total the browser reports for this app, so that whatever the parts do not explain is
    named rather than hidden.
  </p>
</header>

{#if account === null}
  <p class="px-responsive py-5 text-sm text-muted">{view.message ?? 'Reading what is stored…'}</p>
{:else}
  <div class="px-responsive pt-4 pb-6">
    <StorageAccountCard {account} {engineHref} />
  </div>
{/if}
