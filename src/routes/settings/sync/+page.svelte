<script lang="ts">
  import { useContainer } from '$lib/context';
  import { CATALOG_NEEDS } from '$lib/domains/library/ui/catalog-needs';
  import SyncSettings from '$lib/domains/sync/ui/SyncSettings.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';
  import { getToaster } from '$lib/ui/components/toast-context';
  import SettingsShell from '../SettingsShell.svelte';

  const container = useContainer();
  const notify = toastNotify(getToaster());
</script>

<SettingsShell current="sync">
  <SyncSettings sync={container.sync} choices={CATALOG_NEEDS} {notify} />
</SettingsShell>
