<script lang="ts">
  import { useContainer } from '$lib/context';
  import { EngineSettingsView } from '$lib/domains/recognition/ui/engine/engine-settings.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/engine/redesign/b/EngineSettingsScreen.svelte';
  import SettingsShell from '../../../settings/redesign/b/SettingsShell.svelte';

  const view = new EngineSettingsView(useContainer());

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<SettingsShell current="engine" root="/preview/b/settings">
  <EngineSettingsScreen {view} storageHref="/preview/b/settings/storage" />
</SettingsShell>
