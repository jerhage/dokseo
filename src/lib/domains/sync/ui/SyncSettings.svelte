<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import type { Notify } from '$lib/shared/notice';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import { syncKeys } from '../queries/sync-keys';
  import { syncStatusQuery } from '../queries/sync-queries';
  import { defaultDeviceName } from './device-name';
  import type { DownloadChoiceSource, SyncSettingsUseCases } from './sync-deps';
  import { STORAGE_TEXT } from './sync-texts';
  import type { DisconnectOutcome } from './sync-texts';
  import { syncView } from './sync-view';
  import SyncConnected from './SyncConnected.svelte';
  import SyncConnectForm from './SyncConnectForm.svelte';

  type Props = {
    readonly sync: SyncSettingsUseCases;
    readonly choices: DownloadChoiceSource;
    readonly notify: Notify;
    readonly userAgent?: string;
  };

  let {
    sync,
    choices,
    notify,
    userAgent = globalThis.navigator?.userAgent ?? '',
  }: Props = $props();

  const client = useQueryClient();
  const status = readQuery(() => syncStatusQuery(sync));
  const view = $derived(syncView(status.state));
  let farewell = $state.raw<DisconnectOutcome | null>(null);

  function refresh(): void {
    void client.invalidateQueries({ queryKey: syncKeys.all() });
  }

  function disconnected(outcome: DisconnectOutcome): void {
    farewell = outcome;
    refresh();
  }

  function connected(): void {
    farewell = null;
    refresh();
  }
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">Sync</h1>
    <p class="text-sm text-muted">
      Keep your library, reading positions, captures and catalogs the same on every device. Books
      themselves are not sent: each device keeps its own files.
    </p>
  </header>

  {#if view.kind === 'failed'}
    <Alert variant="danger" title="Sync could not be read">{view.message}</Alert>
  {:else if view.kind === 'storage-unavailable'}
    <Alert variant="warning">{STORAGE_TEXT}</Alert>
  {:else if view.kind === 'not-connected'}
    {#if farewell !== null}
      <Alert variant={farewell.variant} title={farewell.title}>{farewell.text}</Alert>
    {/if}
    <SyncConnectForm {sync} deviceName={defaultDeviceName(userAgent)} onconnected={connected} />
  {:else if view.kind === 'connected'}
    <SyncConnected
      {sync}
      {choices}
      {notify}
      connection={view.connection}
      onchange={refresh}
      ondisconnected={disconnected}
    />
  {/if}
</div>
