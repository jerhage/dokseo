<script lang="ts">
  import { useContainer } from '$lib/context';
  import CatalogSettings from '$lib/domains/catalog/ui/CatalogSettings.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';
  import { getToaster } from '$lib/ui/components/toast-context';
  import SettingsShell from '../SettingsShell.svelte';

  const container = useContainer();
  const notify = toastNotify(getToaster());
</script>

<SettingsShell current="catalogs">
  <CatalogSettings catalog={container.catalog} {notify} />
</SettingsShell>
