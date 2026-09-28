<script lang="ts">
  import { untrack } from 'svelte';
  import { getToaster } from '$lib/components/toast-context';
  import { useContainer } from '$lib/context';
  import EngineAside from '$lib/domains/recognition/ui/engine/EngineAside.svelte';
  import { EngineSettingsView } from '$lib/domains/recognition/ui/engine/engine-settings.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/engine/EngineSettingsScreen.svelte';
  import SettingsShell from './SettingsShell.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';

  const view = new EngineSettingsView(useContainer(), toastNotify(getToaster()));

  $effect(() => {
    untrack(() => void view.load());
    return () => view.dispose();
  });
</script>

<SettingsShell current="engine" flush>
  {#snippet aside()}
    <EngineAside {view} />
  {/snippet}
  <EngineSettingsScreen {view} storageHref="/settings/storage" />
</SettingsShell>
