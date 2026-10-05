<script lang="ts">
  import Alert from '../components/Alert.svelte';
  import Button from '../components/Button.svelte';
  import type { StatusVariant } from '../components/classes';
  import DemoSection from './DemoSection.svelte';

  type Dismissible = StatusVariant | 'banner';

  let dismissed = $state<readonly Dismissible[]>([]);

  function dismiss(alert: Dismissible): void {
    dismissed = [...dismissed, alert];
  }
</script>

{#snippet manageStorage()}
  <Button size="sm">Manage storage</Button>
{/snippet}

<DemoSection
  id="alert"
  title="Alert"
  classes={[
    'alert',
    'alert-success',
    'alert-warning',
    'alert-danger',
    'alert-info',
    'alert-banner',
  ]}
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
  <div class="surface bordered rounded-container overflow-hidden">
    {#if !dismissed.includes('banner')}
      <Alert variant="warning" banner title="A banner alert" ondismiss={() => dismiss('banner')}>
        Square, and flush with the sides of the surface it heads.
      </Alert>
    {/if}
    <p class="p-5 text-sm text-muted">The surface the banner sits at the top of.</p>
  </div>
  <div class="row">
    <Button size="sm" disabled={dismissed.length === 0} onclick={() => (dismissed = [])}>
      Restore alerts
    </Button>
  </div>
</DemoSection>
