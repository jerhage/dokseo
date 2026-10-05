<script lang="ts">
  import { version } from '$app/environment';
  import Button from '$lib/ui/components/Button.svelte';
  import Stat from '$lib/ui/components/Stat.svelte';
  import { APP_VERSION } from '$lib/shared/app-version';
  import { useShellUpdates } from '$lib/shared/shell-updates-context';

  const updates = useShellUpdates();

  let checking = $state(false);

  async function check(): Promise<void> {
    checking = true;
    await updates.checkNow();
    checking = false;
  }
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">App</h1>
    <p class="text-sm text-muted">
      The version this device runs. The app looks for a newer one by itself when it comes back into
      view and every 30 minutes, and offers it with a Reload button.
    </p>
  </header>

  <section class="surface bordered rounded-container p-5" aria-label="Version">
    <div class="row wrap items-center justify-between gap-3">
      <div class="col gap-1">
        <Stat class="p-0" label="Version" value={APP_VERSION} size="sm" />
        <span class="text-xs text-faint">Build {version}</span>
      </div>
      <Button onclick={check} disabled={checking}>
        {checking ? 'Checking…' : 'Check for updates'}
      </Button>
    </div>
  </section>

  {#if import.meta.env.DEV}
    <section class="surface bordered rounded-container p-5" aria-label="Developer">
      <div class="col gap-3">
        <h2 class="text-base weight-semibold">Developer</h2>
        <div class="row wrap gap-3">
          <Button href="/docs">Docs</Button>
          <Button href="/playground">Component playground</Button>
        </div>
      </div>
    </section>
  {/if}
</div>
