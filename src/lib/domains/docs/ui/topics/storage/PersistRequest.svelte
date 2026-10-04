<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import { isPersisted, requestPersistence } from '$lib/platform/storage/persistence';
  import { holdsGrant, persistOutcome, persistOutcomeText } from '../../../domain/storage-figures';
  import type { PersistOutcome } from '../../../domain/storage-figures';
  import DocsDemo from '../../DocsDemo.svelte';

  let outcome = $state.raw<PersistOutcome | null>(null);
  let asking = $state(false);

  async function request(): Promise<void> {
    asking = true;
    try {
      const supported = typeof navigator.storage?.persist === 'function';
      const before = supported ? await isPersisted() : null;
      const after = supported ? await requestPersistence() : null;
      outcome = persistOutcome(before, after);
    } finally {
      asking = false;
    }
  }
</script>

<DocsDemo label="Request the grant">
  <p class="m-0 text-sm">
    This calls <code>navigator.storage.persist()</code> for this origin, the same call Dokseo makes. A
    grant covers everything the origin holds, Dokseo's books and captures included, and only clearing
    the site's data in the browser's settings undoes it.
  </p>
  <div class="row wrap items-center gap-2">
    <Button size="sm" variant="primary" disabled={asking} onclick={() => void request()}>
      Request persistent storage
    </Button>
  </div>
  {#if outcome !== null}
    <Alert
      variant={holdsGrant(outcome) ? 'success' : 'warning'}
      title={holdsGrant(outcome) ? 'Persistent' : 'Still best-effort'}
    >
      {persistOutcomeText(outcome)}
    </Alert>
  {/if}
</DocsDemo>
