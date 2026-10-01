<script lang="ts">
  import { useContainer } from '$lib/context';
  import StorageScreen from '$lib/domains/storage/ui/StorageScreen.svelte';
  import SettingsShell from '../SettingsShell.svelte';

  const container = useContainer();
</script>

<SettingsShell current="storage">
  <StorageScreen storage={container.storage} />
</SettingsShell>
