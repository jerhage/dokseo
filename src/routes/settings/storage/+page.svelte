<script lang="ts">
  import { untrack } from 'svelte';
  import { useContainer } from '$lib/context';
  import { StorageSettingsView } from '$lib/domains/storage/ui/storage-view.svelte';
  import StorageScreen from '$lib/domains/storage/ui/StorageScreen.svelte';
  import SettingsShell from '../SettingsShell.svelte';

  const view = new StorageSettingsView(useContainer());

  $effect(() => {
    untrack(() => void view.load());
    return () => view.dispose();
  });
</script>

<SettingsShell current="storage">
  <StorageScreen {view} />
</SettingsShell>
