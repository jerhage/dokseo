<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import type { StatusVariant } from '$lib/components/classes';
  import DemoSection from './DemoSection.svelte';

  let dismissed = $state<readonly StatusVariant[]>([]);

  function dismiss(variant: StatusVariant): void {
    dismissed = [...dismissed, variant];
  }
</script>

{#snippet manageStorage()}
  <Button size="sm">Manage storage</Button>
{/snippet}

<DemoSection
  id="alert"
  title="Alert"
  classes={['alert', 'alert-success', 'alert-warning', 'alert-danger', 'alert-info']}
>
  <div class="grid-2">
    {#if !dismissed.includes('success')}
      <Alert variant="success" title="Changes published" ondismiss={() => dismiss('success')}>
        Your site is live at the new address.
      </Alert>
    {/if}
    {#if !dismissed.includes('warning')}
      <Alert
        variant="warning"
        title="Storage 90% full"
        actions={manageStorage}
        ondismiss={() => dismiss('warning')}
      >
        Archive old files or add capacity.
      </Alert>
    {/if}
    {#if !dismissed.includes('danger')}
      <Alert variant="danger" title="Payment failed" ondismiss={() => dismiss('danger')}>
        Update your card to keep your plan active.
      </Alert>
    {/if}
    {#if !dismissed.includes('info')}
      <Alert variant="info" title="Scheduled maintenance" ondismiss={() => dismiss('info')}>
        Sunday 02:00–03:00 UTC.
      </Alert>
    {/if}
    <Alert variant="info">Without a title or a close button.</Alert>
  </div>
  <div class="row">
    <Button size="sm" disabled={dismissed.length === 0} onclick={() => (dismissed = [])}>
      Restore alerts
    </Button>
  </div>
</DemoSection>
