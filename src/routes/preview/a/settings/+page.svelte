<script lang="ts">
  import { useContainer } from '$lib/context';
  import { EngineSettingsView } from '$lib/domains/recognition/ui/engine/engine-settings.svelte';
  import EngineAside from '$lib/domains/recognition/ui/engine/redesign/a/EngineAside.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/engine/redesign/a/EngineSettingsScreen.svelte';
  import SettingsShell from '../../../settings/redesign/a/SettingsShell.svelte';

  const view = new EngineSettingsView(useContainer());

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<SettingsShell current="engine" root="/preview/a/settings">
  {#snippet aside()}
    <EngineAside {view} />
  {/snippet}
  <EngineSettingsScreen {view} storageHref="/preview/a/settings/storage" />
</SettingsShell>
