<script lang="ts">
  import { untrack } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import type { SyncSettingsUseCases } from './sync-deps';
  import { createSyncConnect } from './sync-connect.svelte';

  type Props = {
    readonly sync: Pick<SyncSettingsUseCases, 'connectSync'>;
    readonly deviceName: string;
    readonly onconnected: () => void;
  };

  let { sync, deviceName, onconnected }: Props = $props();

  const form = createSyncConnect(untrack(() => deviceName));

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const result = await form.submit((...details) => sync.connectSync(...details));
    if (result !== null && result.kind === 'success') onconnected();
  }
</script>

<form class="stack-md" onsubmit={submit}>
  <Field label="Server address" hint="The address of your dokseo-sync server.">
    {#snippet children(control)}
      <Input
        {...control}
        name="server"
        type="url"
        autocomplete="url"
        placeholder="https://host.ts.net/sync/"
        disabled={form.connecting}
        bind:value={form.serverUrl}
      />
    {/snippet}
  </Field>

  <Field label="Username">
    {#snippet children(control)}
      <Input
        {...control}
        name="username"
        type="text"
        autocomplete="username"
        disabled={form.connecting}
        bind:value={form.username}
      />
    {/snippet}
  </Field>

  <Field label="Password" hint="Used once to sign this device in. It is never saved.">
    {#snippet children(control)}
      <Input
        {...control}
        name="password"
        type="password"
        autocomplete="current-password"
        disabled={form.connecting}
        bind:value={form.password}
      />
    {/snippet}
  </Field>

  <Field label="This device's name" hint="Shown in the device list on every connected device.">
    {#snippet children(control)}
      <Input
        {...control}
        name="device"
        type="text"
        autocomplete="off"
        disabled={form.connecting}
        bind:value={form.deviceName}
      />
    {/snippet}
  </Field>

  {#if form.phase.kind === 'failed'}
    <Alert variant="warning" aria-live="polite">{form.phase.text}</Alert>
  {/if}

  <div class="row">
    <Button
      variant="primary"
      type="submit"
      loading={form.connecting}
      disabled={form.connecting || !form.ready}
    >
      {form.connecting ? 'Connecting…' : 'Connect'}
    </Button>
  </div>
</form>
