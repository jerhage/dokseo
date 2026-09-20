<script lang="ts">
  import { useContainer } from '$lib/context';
  import { EngineSettingsView } from '$lib/domains/recognition/ui/engine-settings.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/EngineSettingsScreen.svelte';

  const view = new EngineSettingsView(useContainer());

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<EngineSettingsScreen {view} />
