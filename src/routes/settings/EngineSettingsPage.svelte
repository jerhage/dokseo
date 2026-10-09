<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query';
  import { onMount } from 'svelte';
  import { getToaster } from '$lib/ui/components/toast-context';
  import { useContainer } from '$lib/context';
  import EngineAside from '$lib/domains/recognition/ui/engine/EngineAside.svelte';
  import { createEngineLanguage } from '$lib/domains/recognition/ui/engine/engine-language.svelte';
  import { EngineSetup } from '$lib/domains/recognition/ui/engine/engine-setup-writes.svelte';
  import EngineSettingsScreen from '$lib/domains/recognition/ui/engine/EngineSettingsScreen.svelte';
  import { createRemovalConfirm } from '$lib/domains/recognition/ui/engine/removal-confirm.svelte';
  import SettingsShell from './SettingsShell.svelte';
  import { toastNotify } from '$lib/shared/notice-toast';

  const container = useContainer();
  const view = new EngineSetup(container, toastNotify(getToaster()), useQueryClient());
  const removalConfirm = createRemovalConfirm();
  const languageChoice = createEngineLanguage(() => {
    view.languageChosen();
    removalConfirm.dismiss();
  });

  onMount(() => () => view.dispose());
</script>

<SettingsShell current="engine" flush>
  {#snippet aside()}
    <EngineAside recognition={container.recognition} {view} {languageChoice} />
  {/snippet}
  <EngineSettingsScreen
    recognition={container.recognition}
    {view}
    {languageChoice}
    {removalConfirm}
    storageHref="/settings/storage"
  />
</SettingsShell>
