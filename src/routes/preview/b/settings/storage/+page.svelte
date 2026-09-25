<script lang="ts">
  import { useContainer } from '$lib/context';
  import StorageScreen from '$lib/domains/storage/ui/redesign/b/StorageScreen.svelte';
  import { StorageSettingsView } from '$lib/domains/storage/ui/storage-view.svelte';
  import SettingsShell from '../../../../settings/redesign/b/SettingsShell.svelte';

  const view = new StorageSettingsView(useContainer());

  $effect(() => {
    void view.load();
    return () => view.dispose();
  });
</script>

<SettingsShell current="storage" root="/preview/b/settings">
  <StorageScreen {view} engineHref="/preview/b/settings" />
</SettingsShell>
