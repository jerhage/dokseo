<script lang="ts">
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { readBoth } from '$lib/shared/read-state';
  import { engineStatus } from '../../domain/engine/ocr-engine';
  import { computeQuery, recognizerSetupQuery, setupState } from '../../queries/engine-queries';
  import type { EngineReads } from '../../queries/engine-queries';
  import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
  import { engineStateOf } from './engine-figures';
  import type { EngineLanguageHook } from './engine-language.svelte';
  import type { EngineSetup } from './engine-setup-writes.svelte';
  import { activeDevice, activeEngine } from './engine-screen';
  import { engineChoiceOf, shownModel } from './engine-setup';
  import ModelStorageData from './ModelStorageData.svelte';

  type Props = {
    readonly recognition: EngineReads;
    readonly view: EngineSetup;
    readonly languageChoice: EngineLanguageHook;
  };

  let { recognition, view, languageChoice }: Props = $props();

  const setup = readQuery(() => recognizerSetupQuery(recognition, languageChoice.language));
  const compute = readQuery(() => computeQuery(recognition));
  const choice = $derived(readBoth(setupState(setup.state), compute.state, engineChoiceOf));
  const model = $derived(choice.kind === 'ready' ? shownModel(choice.value) : null);
</script>

{#snippet device(storage: ModelStorageSnapshot | null)}
  <p class="text-xs text-muted">
    {activeDevice(
      view.download.session,
      engineStatus(engineStateOf(view.download.state, view.download.session, storage)),
    )}
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
