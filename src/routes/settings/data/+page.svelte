<script lang="ts">
  import { useContainer } from '$lib/context';
  import DataSettings from '$lib/domains/storage/ui/DataSettings.svelte';
  import SettingsShell from '../SettingsShell.svelte';

  const container = useContainer();
</script>

<SettingsShell current="data">
  <DataSettings data={container.storage} />
</SettingsShell>
