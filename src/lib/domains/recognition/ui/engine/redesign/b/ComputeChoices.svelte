<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import {
    COMPUTE_CHOICES,
    computeChoiceName,
    computeCpuNote,
    computeDetectionNote,
    computeGpuWarning,
  } from '../../../../domain/engine/compute-choice';
  import { engineFellBack } from '../../../../domain/engine/ocr-engine';
  import { deviceName } from '../../../../domain/engine/recognizer-session';
  import type { EngineSettingsView } from '../../engine-settings.svelte';

  type Props = { readonly view: EngineSettingsView };

  let { view }: Props = $props();

  const uid = $props.id();

  const session = $derived(view.session);
  const cpuNote = $derived(computeCpuNote(view.compute));
  const gpuWarning = $derived(computeGpuWarning(view.compute));
  const fellBack = $derived(engineFellBack(session));

  const footer = 'px-1 text-xs text-muted';
</script>

<section class="col gap-2" aria-labelledby="{uid}-heading">
  <h2 id="{uid}-heading" class="px-1 text-xs uppercase tracking-wide text-muted weight-semibold">
    Compute
  </h2>
  <div
    class="surface bordered rounded-container overflow-hidden"
    role="radiogroup"
    aria-labelledby="{uid}-heading"
  >
    <ul class="list-reset">
      {#each COMPUTE_CHOICES as choice, index (choice)}
        <li class={['px-4 py-3', { 'border-t': index > 0 }]}>
          <Radio
            name="{uid}-compute-choice"
            value={choice}
            group={view.compute}
            onchange={() => void view.chooseCompute(choice)}
          >
            {computeChoiceName(choice)}
          </Radio>
        </li>
      {/each}
    </ul>
  </div>
  <p class={footer}>{computeDetectionNote(view.detection, view.compute)}</p>
  {#if cpuNote !== null}
    <p class={footer}>{cpuNote}</p>
  {/if}
  {#if gpuWarning !== null}
    <Alert variant="warning" role="alert">{gpuWarning}</Alert>
  {/if}
  {#if session !== null}
    <p class={footer}>This session opened on the {deviceName(session.device)}.</p>
  {/if}
  {#if fellBack !== null}
    <p class={footer}>{fellBack}</p>
  {/if}
</section>
