<script lang="ts">
  import { untrack } from 'svelte';
  import type { Language } from '$lib/shared/language';
  import { readQuery } from '$lib/shared/read-query.svelte';
  import { LOADING } from '$lib/shared/read-state';
  import {
    modelConsentQuery,
    modelStorageQuery,
    recognizerSetupQuery,
  } from '../../queries/engine-queries';
  import type { EngineReads } from '../../queries/engine-queries';
  import { chosenFootprint } from './chosen-footprint';
  import { readsSettled } from './engine-gate';
  import type { EngineGateRead } from './engine-gate';

  type Props = {
    readonly recognition: Pick<
      EngineReads,
      'readRecognizerSetup' | 'readModelConsent' | 'readModelStorage'
    >;
    readonly language: Language | null;
    readonly onread?: (language: Language) => void;
  };

  let { recognition, language, onread }: Props = $props();

  const setup = readQuery(() => recognizerSetupQuery(recognition, language));
  const consent = readQuery(() => modelConsentQuery(recognition, language));
  const chosen = $derived(language === null ? LOADING : chosenFootprint(language, setup.state));
  const modelId = $derived(chosen.kind === 'ready' ? (chosen.value?.modelId ?? null) : null);
  const storage = readQuery(() => modelStorageQuery(recognition, modelId));

  function reload(): void {
    if (language !== null) {
      setup.reload();
      consent.reload();
    }
    if (modelId !== null) storage.reload();
  }

  const gate: EngineGateRead = {
    get language() {
      return language;
    },
    get chosen() {
      return chosen;
    },
    get consent() {
      return consent.state;
    },
    get storage() {
      return storage.state;
    },
    reload,
  };

  const settled = $derived(language !== null && readsSettled(gate) ? language : null);

  $effect(() => {
    const ready = settled;
    if (ready !== null) untrack(() => onread?.(ready));
  });

  export function read(): EngineGateRead {
    return gate;
  }
</script>
