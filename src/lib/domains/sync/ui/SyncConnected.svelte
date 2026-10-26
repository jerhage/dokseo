<script lang="ts">
  import type { Notify } from '$lib/shared/notice';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Checkbox from '$lib/ui/components/Checkbox.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import type { DownloadChoiceSource, SyncSettingsUseCases } from './sync-deps';
  import { createSyncActions } from './sync-actions.svelte';
  import { lastSyncText } from './sync-time';
  import { AUTO_DOWNLOAD_FAILED, AUTO_DOWNLOAD_HINT, AUTO_DOWNLOAD_LABEL } from './sync-texts';
  import type { DisconnectOutcome } from './sync-texts';
  import type { Connection } from './sync-view';
  import SyncConfirm from './SyncConfirm.svelte';
  import SyncDevices from './SyncDevices.svelte';

  type Props = {
    readonly sync: SyncSettingsUseCases;
    readonly choices: DownloadChoiceSource;
    readonly notify: Notify;
    readonly connection: Connection;
    readonly onchange: () => void;
    readonly ondisconnected: (outcome: DisconnectOutcome) => void;
  };

  let { sync, choices, notify, connection, onchange, ondisconnected }: Props = $props();

  const controls = createSyncActions();
  const lastSync = $derived(lastSyncText(connection.lastSyncAt, Date.now()));

  async function syncNow(): Promise<void> {
    await controls.syncNow(() =>
      sync.syncNow({ matching: choices.matching(), defaults: choices.defaults() }),
    );
    onchange();
  }

  async function chooseAutoDownload(enabled: boolean): Promise<void> {
    const saved = await sync.setAutoDownload(enabled);
    if (saved.kind !== 'success') {
      notify({
        tone: 'warning',
        title: 'Could not save the setting',
        message: AUTO_DOWNLOAD_FAILED,
      });
    }
    onchange();
  }

  async function revoke(): Promise<void> {
    const outcome = await controls.confirmRevoke((deviceId) => sync.revokeSyncDevice(deviceId));
    if (outcome === null) return;
    notify(outcome);
    onchange();
  }

  async function disconnect(): Promise<void> {
    const outcome = await controls.confirmDisconnect(() => sync.disconnectSync());
    if (outcome !== null) ondisconnected(outcome);
  }
</script>

<ListGroup title="Connection">
  <ListRow title="Server" value={connection.serverUrl} />
  <ListRow title="This device" value={connection.deviceName} />
  <ListRow title="Last sync" value={lastSync} />
</ListGroup>

<div class="col gap-3">
  <div class="row">
    <Button
      variant="primary"
      loading={controls.syncing}
      disabled={controls.syncing}
      onclick={syncNow}
    >
      {controls.syncing ? 'Syncing…' : 'Sync now'}
    </Button>
  </div>
  {#if controls.run.kind === 'done'}
    {@const line = controls.run.line}
    {#if line.signedOut}
      <Alert variant={line.variant} aria-live="polite">
        {line.text}
        {#snippet actions()}
          <Button size="sm" variant="danger" onclick={() => controls.askDisconnect()}>
            Disconnect
          </Button>
        {/snippet}
      </Alert>
    {:else}
      <Alert variant={line.variant} aria-live="polite">{line.text}</Alert>
    {/if}
  {/if}
</div>

<Checkbox
  checked={connection.autoDownload}
  hint={AUTO_DOWNLOAD_HINT}
  onchange={(event) => void chooseAutoDownload(event.currentTarget.checked)}
>
  {AUTO_DOWNLOAD_LABEL}
</Checkbox>

<SyncDevices {sync} onrevoke={(device) => controls.askRevoke(device)} />

<div class="row">
  <Button variant="ghost-danger" onclick={() => controls.askDisconnect()}>Disconnect</Button>
</div>

{#if controls.confirm.kind === 'revoke'}
  <SyncConfirm
    title="Revoke this device?"
    body={`${controls.confirm.device.deviceName} will be signed out on the server and stop syncing. Its books and captures stay on it.`}
    confirmLabel="Revoke"
    busyLabel="Revoking…"
    busy={controls.confirming}
    onconfirm={revoke}
    ondismiss={() => controls.dismiss()}
  />
{:else if controls.confirm.kind === 'disconnect'}
  <SyncConfirm
    title="Disconnect this device?"
    body="This device stops syncing and is signed out on the server. Its books and captures stay here."
    confirmLabel="Disconnect"
    busyLabel="Disconnecting…"
    busy={controls.confirming}
    onconfirm={disconnect}
    ondismiss={() => controls.dismiss()}
  />
{/if}
