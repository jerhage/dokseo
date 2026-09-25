<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import Radio from '$lib/components/Radio.svelte';
  import { languageName } from '$lib/shared/language';
  import {
    COMPUTE_CHOICES,
    computeChoiceName,
    computeCpuNote,
    computeDetectionNote,
    computeGpuWarning,
  } from '../../domain/engine/compute-choice';
  import { onDiskMb, runtimeMb, weightsMb } from '../../domain/model/model-footprint';
  import { engineStatus, NOT_INSTALLED, ON_DEVICE_ENGINE } from '../../domain/engine/ocr-engine';
  import { deviceName } from '../../domain/engine/recognizer-session';
  import {
    cancelHint,
    engineLanguages,
    loadFigure,
    partialFigure,
    REMOVAL_WARNING,
    resumeLabel,
    storedFigure,
  } from './engine-settings.svelte';
  import type { EngineSettingsView } from './engine-settings.svelte';
  import EngineTrade from './EngineTrade.svelte';
  import {
    engineActionOf,
    loadPercent,
    modelFootnote,
    removalMb,
    statusVariant,
    UNBUILT_ENGINES,
    weightsFigure,
  } from './engine-screen';

  type Props = { readonly view: EngineSettingsView; readonly storageHref?: string };

  let { view, storageHref = '/settings/storage' }: Props = $props();

  const uid = $props.id();

  const model = $derived(view.model);
  const language = $derived(view.language);
  const download = $derived(view.download);
  const loading = $derived(download.kind === 'loading');
  const storage = $derived(view.storage);
  const session = $derived(view.session);
  const gpuWarning = $derived(computeGpuWarning(view.compute));
  const cpuNote = $derived(computeCpuNote(view.compute));

  const state = $derived(engineStatus(view.engine));
  const partial = $derived(partialFigure(view.partial, view.stored));
  const action = $derived(
    engineActionOf({
      loading,
      stored: view.stored,
      resumable: view.resumable,
      confirmingRemoval: view.confirmingRemoval,
    }),
  );

  const failure = $derived(download.kind === 'failed' ? download.cause : null);
  const progress = $derived(download.kind === 'loading' ? download.load : null);
  const percent = $derived(loadPercent(progress));

  const languages = engineLanguages();
  const caption = 'mono text-xs uppercase tracking-wide text-faint';
  const note = 'text-xs text-muted surface-sunken bordered rounded-control px-3 py-2';
</script>

<header class="col gap-1 px-responsive pt-5 pb-4 border-b">
  <h1 class="text-lg">OCR engine</h1>
  <p class="prose text-sm text-muted">
    Pick where recognition runs. Only the on-device engine is built, and it uploads nothing. The
    other two are listed with what each would cost you, and neither can be picked until it exists.
  </p>
</header>

{#if model === null || language === null}
  <p class="px-responsive py-5 text-sm text-muted">
    No recognition model has been chosen for any language yet.
  </p>
{:else}
  <div class="col gap-4 px-responsive pt-4 pb-6">
    <section
      class="surface bordered rounded-container overflow-hidden"
      aria-labelledby="{uid}-engine"
    >
      <div class="col gap-2 p-4 surface-raised">
        <div class="row wrap items-center justify-between gap-2">
          <div class="row wrap items-center gap-2">
            <input
              class="radio-input"
              type="radio"
              name="{uid}-engine-choice"
              value={ON_DEVICE_ENGINE.id}
              checked
              aria-labelledby="{uid}-engine"
            />
            <h2 class="text-base weight-semibold" id="{uid}-engine">On-device</h2>
            <Badge variant="brand">In use</Badge>
            <EngineTrade engine={ON_DEVICE_ENGINE} {model} />
          </div>
          <p><Badge dot variant={statusVariant(state.tone)}>{state.label}</Badge></p>
        </div>
        <p class="prose text-sm text-muted">
          Runs {model.engine} in this app. Works offline once the weights are here; it costs a one-time
          download of about {weightsMb(model)} MB of weights and about {runtimeMb(model)} MB of runtime,
          about {onDiskMb(model)} MB on disk.
        </p>
        <p class="text-xs text-faint">{state.note}</p>
      </div>

      {#if loading}
        <div class="col gap-2 p-4 border-t">
          <div class="row wrap items-center justify-between gap-2">
            <span class="text-sm">{model.label} weights</span>
            <span class="mono text-xs text-muted">{loadFigure(progress)}</span>
          </div>
          <Progress label="{state.label} the recognition model" value={percent} />
          <div class="row wrap items-center gap-2">
            <span class="flex-fill text-xs text-muted">{cancelHint(progress)}</span>
            <Button size="sm" onclick={() => void view.pause()}>Pause</Button>
            <Button size="sm" onclick={() => void view.stop()}>Cancel</Button>
          </div>
        </div>
      {/if}

      <div class="grid-2 p-4 border-t">
        <div class="col gap-2">
          <p class={caption} id="{uid}-language">Language</p>
          <div class="grid-3 grid-auto-sm" role="group" aria-labelledby="{uid}-language">
            {#each languages as offered (offered)}
              <Button
                size="sm"
                variant={language === offered ? 'outline' : 'default'}
                active={language === offered}
                aria-pressed={language === offered}
                onclick={() => void view.chooseLanguage(offered)}
              >
                {languageName(offered)}
              </Button>
            {/each}
          </div>
          <p class={caption} id="{uid}-model">Model</p>
          <ul class="list-reset col gap-2" aria-labelledby="{uid}-model">
            {#each view.models as offered (offered.modelId)}
              <li class="col gap-1">
                <Radio
                  name="{uid}-model-choice"
                  value={offered.modelId}
                  group={model.modelId}
                  hint={weightsFigure(offered)}
                  class="surface-sunken bordered rounded-control px-3 py-2"
                  onchange={() => void view.chooseModel(offered.modelId)}
                >
                  {offered.label}
                </Radio>
                <p class="text-xs text-muted">{modelFootnote(offered)}</p>
              </li>
            {/each}
          </ul>
        </div>

        <div class="col gap-2">
          <p class={caption} id="{uid}-compute">Compute</p>
          <div class="grid-3 grid-auto-sm" role="group" aria-labelledby="{uid}-compute">
            {#each COMPUTE_CHOICES as choice (choice)}
              <Button
                size="sm"
                variant={view.compute === choice ? 'outline' : 'default'}
                active={view.compute === choice}
                aria-pressed={view.compute === choice}
                onclick={() => void view.chooseCompute(choice)}
              >
                {computeChoiceName(choice)}
              </Button>
            {/each}
          </div>
          <p class={note}>{computeDetectionNote(view.detection, view.compute)}</p>
          {#if cpuNote !== null}
            <p class={note}>{cpuNote}</p>
          {/if}
          {#if gpuWarning !== null}
            <Alert variant="warning" role="alert">{gpuWarning}</Alert>
          {/if}
          {#if session !== null}
            <p class={note}>This session opened on the {deviceName(session.device)}.</p>
          {/if}
        </div>
      </div>

      <div class="col gap-2 p-4 border-t">
        <p class={caption}>Stored on this device</p>
        <p class="mono text-sm">
          {storage === null
            ? (view.storageMessage ?? 'Reading what is stored…')
            : storedFigure(storage.report)}
        </p>
        {#if partial !== null}
          <p class="text-xs text-muted">{partial}</p>
        {/if}
        <p class="text-xs text-muted">
          This is what the model occupies, not what the app does.
          <a href={storageHref}>Storage</a>
          accounts for every megabyte on this device.
        </p>
        {#if storage !== null && !storage.persisted}
          <p class="text-xs text-muted">
            The browser has not granted persistence, so it may reclaim this space on its own.
          </p>
        {/if}

        {#if action.kind !== 'none'}
          <div class="row wrap gap-2 mt-1">
            {#if action.kind === 'resume'}
              <Button variant="primary" size="sm" onclick={() => void view.start()}>
                {resumeLabel(view.partial)}
              </Button>
              <Button size="sm" onclick={() => void view.stop()}>Discard what was fetched</Button>
            {:else if action.kind === 'download'}
              <Button variant="primary" size="sm" onclick={() => void view.start()}>
                Download now
              </Button>
            {:else}
              <Button
                variant="ghost-danger"
                size="sm"
                disabled={view.removing}
                onclick={() => view.askRemoval()}
              >
                {view.removing ? 'Deleting…' : 'Delete the model'}
              </Button>
            {/if}
          </div>
        {/if}

        {#if view.confirmingRemoval}
          <Alert variant="warning" role={undefined}>
            Delete about {removalMb(storage, model)} MB of weights? {REMOVAL_WARNING}
            {#snippet actions()}
              <Button size="sm" onclick={() => view.dismissRemoval()}>Keep it</Button>
              <Button variant="danger" size="sm" onclick={() => void view.remove()}>
                Delete the model
              </Button>
            {/snippet}
          </Alert>
        {/if}

        {#if failure !== null}
          <Alert variant="danger">The model could not be loaded: {failure}</Alert>
        {/if}
        {#if view.message !== null}
          <p class="text-xs text-muted" role="status">{view.message}</p>
        {/if}
      </div>
    </section>

    {#each UNBUILT_ENGINES as offered (offered.id)}
      <section
        class="col gap-2 p-4 surface-sunken bordered rounded-container"
        aria-labelledby="{uid}-{offered.id}"
      >
        <div class="row wrap items-center justify-between gap-2">
          <div class="row wrap items-center gap-2">
            <input
              class="radio-input"
              type="radio"
              name="{uid}-engine-choice"
              value={offered.id}
              disabled
              aria-labelledby="{uid}-{offered.id}"
            />
            <h2 class="text-base weight-semibold" id="{uid}-{offered.id}">{offered.name}</h2>
            <Badge>{offered.kind}</Badge>
            <EngineTrade engine={offered} {model} />
          </div>
          <p>
            <Badge dot variant={statusVariant(NOT_INSTALLED.tone)}>{NOT_INSTALLED.label}</Badge>
          </p>
        </div>
        <p class="prose text-sm text-muted">{offered.summary}</p>
        <p class="text-xs text-faint">{NOT_INSTALLED.note}</p>
      </section>
    {/each}
  </div>
{/if}
