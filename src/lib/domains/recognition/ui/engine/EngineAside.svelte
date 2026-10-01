<script lang="ts">
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { readBoth } from '$lib/shared/read-state';
  import { engineStatus } from '../../domain/engine/ocr-engine';
  import { computeQuery, recognizerSetupQuery } from '../../queries/engine-queries';
  import type { EngineReads } from '../../queries/engine-queries';
  import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
  import type { EngineSettingsView } from './engine-settings.svelte';
  import { activeDevice, activeEngine } from './engine-screen';
  import { engineChoiceOf, shownModel } from './engine-setup.svelte';
  import ModelStorageData from './ModelStorageData.svelte';

  type Props = { readonly recognition: EngineReads; readonly view: EngineSettingsView };

  let { recognition, view }: Props = $props();

  const setup = readQuery(() => recognizerSetupQuery(recognition, view.language));
  const compute = readQuery(() => computeQuery(recognition));
  const choice = $derived(readBoth(setup.state, compute.state, engineChoiceOf));
  const model = $derived(choice.kind === 'ready' ? shownModel(choice.value) : null);
</script>

{#snippet device(storage: ModelStorageSnapshot | null)}
  <p class="text-xs text-muted">
    {activeDevice(view.download.session, engineStatus(view.engine(storage)))}
  </p>
{/snippet}

<div class="col gap-1 surface-sunken bordered rounded-container p-3">
  <p class="eyebrow mono text-faint">Active engine</p>
  <p class="text-sm">{activeEngine(model)}</p>
  {#if model === null}
    {@render device(null)}
  {:else}
    <ModelStorageData {recognition} modelId={model.modelId}>
      {#snippet children(shown)}
        {@render device(shown.snapshot)}
      {/snippet}
    </ModelStorageData>
  {/if}
</div>
