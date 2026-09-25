<script lang="ts">
  import { useContainer } from '$lib/context';
  import EngineAside from '$lib/domains/recognition/ui/engine/EngineAside.svelte';
  import { EngineSettingsView } from '$lib/domains/recognition/ui/engine/engine-settings.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/engine/EngineSettingsScreen.svelte';
  import SettingsShell from '../../../settings/redesign/b/SettingsShell.svelte';

  const view = new EngineSettingsView(useContainer());

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<SettingsShell current="engine" root="/preview/b/settings" flush>
  {#snippet aside()}
    <EngineAside {view} />
  {/snippet}
  <div class="scheme-dark surface-bg min-h-screen">
    <EngineSettingsScreen {view} />
  </div>
</SettingsShell>
