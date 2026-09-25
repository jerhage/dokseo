<script lang="ts">
  import type { EngineSettingsView } from '../../engine-settings.svelte';
  import ComputeChoices from './ComputeChoices.svelte';
  import EngineChoices from './EngineChoices.svelte';
  import EngineStatusCard from './EngineStatusCard.svelte';
  import ModelChoices from './ModelChoices.svelte';
  import ModelOnDevice from './ModelOnDevice.svelte';

  type Props = { readonly view: EngineSettingsView; readonly storageHref?: string };

  let { view, storageHref = '/settings/storage' }: Props = $props();

  const model = $derived(view.model);
  const language = $derived(view.language);
</script>

<div class="col gap-6 prose">
  <header class="col gap-1">
    <h1 class="text-lg">OCR engine</h1>
    <p class="text-sm text-muted">
      Pick where recognition runs. Only the on-device engine is built, and it uploads nothing. The
      other two are listed with what each would cost you, and neither can be picked until it exists.
    </p>
  </header>

  {#if model === null || language === null}
    <p class="surface bordered rounded-container p-5 text-sm text-muted">
      No recognition model has been chosen for any language yet.
    </p>
  {:else}
    <EngineStatusCard {view} {model} />
    <ModelChoices {view} {model} {language} />
    <ComputeChoices {view} />
    <ModelOnDevice {view} {model} {storageHref} />
    <EngineChoices {model} />
  {/if}
</div>
