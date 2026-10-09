<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Progress from '$lib/ui/components/Progress.svelte';
  import Radio from '$lib/ui/components/Radio.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
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
    loadFigure,
    partialFigure,
    resumeLabel,
    storedFigure,
  } from './engine-settings.svelte';
  import type { EngineSettingsView } from './engine-settings.svelte';
  import { REMOVAL_WARNING } from './model-removal.svelte';
  import { isModelStored, isResumable } from './model-storage';
  import { engineLanguages, shownModel } from './engine-setup';
  import EngineSetupData from './EngineSetupData.svelte';
  import ModelStorageData from './ModelStorageData.svelte';
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
  import type { EngineReads } from '../../queries/engine-queries';

  type Props = {
    readonly recognition: EngineReads;
    readonly view: EngineSettingsView;
    readonly storageHref?: string;
  };

  let { recognition, view, storageHref = '/settings/storage' }: Props = $props();

  const uid = $props.id();

  const download = $derived(view.download.state);
  const loading = $derived(download.kind === 'loading');
  const session = $derived(view.download.session);

  const progress = $derived(download.kind === 'loading' ? download.load : null);
  const percent = $derived(loadPercent(progress));

  const languageOptions = engineLanguages().map((offered) => ({
    value: offered,
    label: languageName(offered),
  }));
  const computeOptions = COMPUTE_CHOICES.map((choice) => ({
    value: choice,
    label: computeChoiceName(choice),
  }));
  const caption = 'eyebrow mono text-faint';
  const note = 'text-xs text-muted surface-sunken bordered rounded-control px-3 py-2';
</script>

<header class="col gap-1 px-responsive pt-5 pb-4 border-b">
  <h1 class="text-lg">OCR engine</h1>
  <p class="prose text-sm text-muted">
    Pick where recognition runs. Only the on-device engine is built, and it uploads nothing. The
    other two are listed with what each would cost you, and neither can be picked until it exists.
  </p>
</header>

<div class="col gap-4 px-responsive pt-4 pb-6">
  <EngineSetupData {recognition} language={view.language}>
    {#snippet children(choice)}
      {@const model = shownModel(choice)}
      {@const gpuWarning = computeGpuWarning(choice.compute)}
      {@const cpuNote = computeCpuNote(choice.compute)}
      <ModelStorageData {recognition} modelId={model.modelId}>
        {#snippet children(shown)}
          {@const storage = shown.snapshot}
          {@const stored = isModelStored(storage)}
          {@const state = engineStatus(view.engine(storage))}
          {@const partial = partialFigure(storage?.partial ?? null, stored)}
          {@const action = engineActionOf({
            loading,
            stored,
            resumable: isResumable(storage),
            confirmingRemoval: view.removal.confirming,
          })}
          <section
            class="surface bordered rounded-container overflow-hidden"
            aria-labelledby="{uid}-engine"
          >
            <div class="col gap-2 p-4 surface-raised">
              <div class="row wrap items-center justify-between gap-2">
                <div class="row wrap items-center gap-2">
                  <Radio
                    name="{uid}-engine-choice"
                    value={ON_DEVICE_ENGINE.id}
                    group={ON_DEVICE_ENGINE.id}
                    aria-labelledby="{uid}-engine"
                  />
                  <h2 class="text-base weight-semibold" id="{uid}-engine">On-device</h2>
                  <Badge variant="primary">In use</Badge>
                  <EngineTrade engine={ON_DEVICE_ENGINE} {model} />
                </div>
                <p><Badge dot variant={statusVariant(state.tone)}>{state.label}</Badge></p>
              </div>
              <p class="prose text-sm text-muted">
                Runs {model.engine} in this app. Works offline once the weights are here; it costs a one-time
                download of about {weightsMb(model)} MB of weights and about {runtimeMb(model)} MB of
                runtime, about {onDiskMb(model)} MB on disk.
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
                  <Button size="sm" onclick={() => void view.pause(choice)}>Pause</Button>
                  <Button size="sm" onclick={() => void view.stop(choice)}>Cancel</Button>
                </div>
              </div>
            {/if}

            <div class="grid-2 p-4 border-t">
              <div class="col gap-2">
                <p class={caption} id="{uid}-language">Language</p>
                <SegmentedControl
                  variant="outline"
                  aria-labelledby="{uid}-language"
                  class="grid-3 grid-auto-sm"
                  options={languageOptions}
                  value={choice.language}
                  onvaluechange={(offered) => view.chooseLanguage(offered)}
                />
                <p class={caption} id="{uid}-model">Model</p>
                <ul class="list-reset col gap-2" aria-labelledby="{uid}-model">
                  {#each choice.models as offered (offered.modelId)}
                    <li class="col gap-1">
                      <Radio
                        name="{uid}-model-choice"
                        value={offered.modelId}
                        group={model.modelId}
                        hint={weightsFigure(offered)}
                        variant="tile"
                        class="bordered"
                        onchange={() => void view.chooseModel(choice, offered.modelId)}
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
                <SegmentedControl
                  variant="outline"
                  aria-labelledby="{uid}-compute"
                  class="grid-3 grid-auto-sm"
                  options={computeOptions}
                  value={choice.compute}
                  onvaluechange={(compute) => void view.chooseCompute(choice, compute)}
                />
                <p class={note}>{computeDetectionNote(choice.detection, choice.compute)}</p>
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
                  ? (shown.message ?? 'Reading what is stored…')
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
                    <Button variant="primary" size="sm" onclick={() => void view.start(choice)}>
                      {resumeLabel(storage?.partial ?? null)}
                    </Button>
                    <Button size="sm" onclick={() => void view.stop(choice)}>
                      Discard what was fetched
                    </Button>
                  {:else if action.kind === 'download'}
                    <Button variant="primary" size="sm" onclick={() => void view.start(choice)}>
                      Download now
                    </Button>
                  {:else}
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      disabled={view.removal.removing}
                      onclick={() => view.removal.ask(stored)}
                    >
                      {view.removal.removing ? 'Deleting…' : 'Delete the model'}
                    </Button>
                  {/if}
                </div>
              {/if}

              {#if view.removal.confirming}
                <Alert variant="warning" role={undefined}>
                  Delete about {removalMb(storage, model)} MB of weights? {REMOVAL_WARNING}
                  {#snippet actions()}
                    <Button size="sm" onclick={() => view.removal.dismiss()}>Keep it</Button>
                    <Button variant="danger" size="sm" onclick={() => void view.remove(choice)}>
                      Delete the model
                    </Button>
                  {/snippet}
                </Alert>
              {/if}

              {#if view.removal.message !== null}
                <p class="text-xs text-muted" role="status">{view.removal.message}</p>
              {/if}
            </div>
          </section>
        {/snippet}
      </ModelStorageData>

      {#each UNBUILT_ENGINES as offered (offered.id)}
        <section
          class="col gap-2 p-4 surface-sunken bordered rounded-container"
          aria-labelledby="{uid}-{offered.id}"
        >
          <div class="row wrap items-center justify-between gap-2">
            <div class="row wrap items-center gap-2">
              <Radio
                name="{uid}-engine-choice"
                value={offered.id}
                group={ON_DEVICE_ENGINE.id}
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
    {/snippet}
  </EngineSetupData>
</div>
