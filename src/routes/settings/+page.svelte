<script lang="ts">
  import { useContainer } from '$lib/context';
  import EngineAside from '$lib/domains/recognition/ui/EngineAside.svelte';
  import { EngineSettingsView } from '$lib/domains/recognition/ui/engine-settings.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/EngineSettingsScreen.svelte';
  import SettingsShell from './SettingsShell.svelte';

  const view = new EngineSettingsView(useContainer());

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<SettingsShell current="engine">
  {#snippet aside()}
    <EngineAside {view} />
  {/snippet}
  <EngineSettingsScreen {view} />
</SettingsShell>
