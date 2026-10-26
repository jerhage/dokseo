<script lang="ts">
  import { readQuery } from '$lib/shared/read-query.svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import ListGroup from '$lib/ui/components/ListGroup.svelte';
  import ListRow from '$lib/ui/components/ListRow.svelte';
  import { syncDevicesQuery } from '../queries/sync-queries';
  import type { DeviceTarget } from './sync-actions.svelte';
  import type { SyncSettingsUseCases } from './sync-deps';
  import { devicesFailureText } from './sync-texts';
  import { deviceFacts } from './sync-time';

  type Props = {
    readonly sync: Pick<SyncSettingsUseCases, 'syncDevices'>;
    readonly onrevoke: (device: DeviceTarget) => void;
  };

  let { sync, onrevoke }: Props = $props();

  const devices = readQuery(() => syncDevicesQuery(sync));
</script>

{#if devices.state.kind === 'failed'}
  <Alert variant="danger" title="Devices could not be read">{devices.state.message}</Alert>
{:else if devices.state.kind === 'ready'}
  {@const result = devices.state.value}
  {#if result.kind === 'success'}
    <ListGroup title="Devices">
      {#each result.devices as device (device.deviceId)}
        {@const facts = deviceFacts(device, Date.now())}
        {#if device.deviceId === result.thisDeviceId}
          <ListRow title={device.deviceName} description={facts} value="This device" />
        {:else}
          <ListRow title={device.deviceName} description={facts}>
            {#snippet actions()}
              <Button
                size="sm"
                variant="ghost-danger"
                onclick={() =>
                  onrevoke({ deviceId: device.deviceId, deviceName: device.deviceName })}
              >
                Revoke
              </Button>
            {/snippet}
          </ListRow>
        {/if}
      {/each}
    </ListGroup>
  {:else}
    <Alert variant="warning" title="Devices could not be listed">
      {devicesFailureText(result)}
    </Alert>
  {/if}
{/if}
