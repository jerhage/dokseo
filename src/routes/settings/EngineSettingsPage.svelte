<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import { onMount } from 'svelte';
  import { getToaster } from '$lib/ui/components/toast-context';
  import { useContainer } from '$lib/context';
  import EngineAside from '$lib/domains/recognition/ui/engine/EngineAside.svelte';
  import { EngineSettingsView } from '$lib/domains/recognition/ui/engine/engine-settings.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/engine/EngineSettingsScreen.svelte';
  import SettingsShell from './SettingsShell.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const view = new EngineSettingsView(container, toastNotify(getToaster()), useQueryClient());

  onMount(() => () => view.dispose());
</script>

<SettingsShell current="engine" flush>
  {#snippet aside()}
    <EngineAside recognition={container.recognition} {view} />
  {/snippet}
  <EngineSettingsScreen
    recognition={container.recognition}
    {view}
    storageHref="/settings/storage"
  />
</SettingsShell>
