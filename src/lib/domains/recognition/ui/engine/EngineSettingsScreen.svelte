<script lang="ts">
  import { megabytes } from '$lib/shared/bytes';
  import { languageName } from '$lib/shared/language';
  import type { Language } from '$lib/shared/language';
  import {
    COMPUTE_CHOICES,
    computeChoiceName,
    computeDetectionNote,
    computeGpuWarning,
  } from '../../domain/engine/compute-choice';
  import type { ComputeChoice } from '../../domain/engine/compute-choice';
  import { downloadMb, onDiskMb, runtimeMb, weightsMb } from '../../domain/model/model-footprint';
  import {
    engineStatus,
    NOT_INSTALLED,
    OCR_ENGINES,
    ON_DEVICE_ENGINE,
  } from '../../domain/engine/ocr-engine';
  import { deviceName } from '../../domain/engine/recognizer-session';
  import EngineTrade from './EngineTrade.svelte';
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

  type Props = { readonly view: EngineSettingsView };

  let { view }: Props = $props();

  const uid = $props.id();

  const model = $derived(view.model);
  const language = $derived(view.language);
  const download = $derived(view.download);
  const loading = $derived(download.kind === 'loading');
  const storage = $derived(view.storage);
  const session = $derived(view.session);
  const gpuWarning = $derived(computeGpuWarning(view.compute));

  const state = $derived(engineStatus(view.engine));
  const partial = $derived(partialFigure(view.partial, view.stored));
  const absent = OCR_ENGINES.filter((offered) => !offered.installed);

  const failure = $derived(download.kind === 'failed' ? download.cause : null);
  const progress = $derived(download.kind === 'loading' ? download.load : null);
  const percent = $derived(progress === null ? 0 : Math.round(progress.fraction * 100));

  function weightsOf(offered: { weightsBytes: number }): string {
    return `${megabytes(offered.weightsBytes)} MB of weights`;
  }

  const languages = engineLanguages();

  function pick(choice: ComputeChoice): void {
    void view.chooseCompute(choice);
  }

  function speak(chosen: Language): void {
    void view.chooseLanguage(chosen);
  }
</script>

<header class="head">
  <h1 class="title">OCR engine</h1>
  <p class="lead">
    Pick where recognition runs. Only the on-device engine is built, and it uploads nothing. The
    other two are listed with what each would cost you, and neither can be picked until it exists.
  </p>
</header>

{#if model === null || language === null}
  <p class="notice">No recognition model has been chosen for any language yet.</p>
{:else}
  <section class="card" aria-labelledby="{uid}-engine">
    <div class="banner">
      <div class="who">
        <input
          class="pick"
          type="radio"
          name="{uid}-engine-choice"
          value={ON_DEVICE_ENGINE.id}
          checked
          aria-labelledby="{uid}-engine"
        />
        <h2 class="who-name" id="{uid}-engine">On-device</h2>
        <span class="badge">In use</span>
        <EngineTrade engine={ON_DEVICE_ENGINE} {model} />
      </div>
      <p class="who-note">
        Runs {model.engine} in this app. Works offline once the weights are here; it costs a one-time
        download of about {weightsMb(model)} MB of weights and about {runtimeMb(model)} MB of runtime,
        about {onDiskMb(model)} MB on disk.
      </p>
      <p class="status {state.tone}">
        <span class="dot" aria-hidden="true"></span>
        {state.label}
      </p>
      <p class="who-note said">{state.note}</p>
    </div>

    {#if loading}
      <div class="progress">
        <div class="row">
          <span class="label">{model.label} weights</span>
          <span class="figure">{loadFigure(progress)}</span>
        </div>
        <div
          class="track"
          role="progressbar"
          aria-label="{state.label} the recognition model"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span class="fill" style:width="{percent}%"></span>
        </div>
        <div class="row">
          <span class="hint">{cancelHint(progress)}</span>
          <button class="quiet" type="button" onclick={() => void view.pause()}>Pause</button>
          <button class="quiet" type="button" onclick={() => void view.stop()}>Cancel</button>
        </div>
      </div>
    {/if}

    <div class="grid">
      <div class="column">
        <p class="caption" id="{uid}-language">Language</p>
        <div class="segments" role="group" aria-labelledby="{uid}-language">
          {#each languages as offered (offered)}
            <button
              class="segment"
              type="button"
              aria-pressed={language === offered}
              onclick={() => speak(offered)}
            >
              {languageName(offered)}
            </button>
          {/each}
        </div>
        <p class="caption" id="{uid}-model">Model</p>
        <ul class="choices" aria-labelledby="{uid}-model">
          {#each view.models as offered (offered.modelId)}
            <li>
              <label class="choice" class:on={offered.modelId === model.modelId}>
                <input
                  type="radio"
                  name="{uid}-model-choice"
                  value={offered.modelId}
                  checked={offered.modelId === model.modelId}
                  onchange={() => void view.chooseModel(offered.modelId)}
                />
                <span class="choice-name">{offered.label}</span>
                <span class="choice-note">{weightsOf(offered)}</span>
              </label>
              <p class="footnote">
                {offered.languages.map(languageName).join(', ')} · {offered.note}
              </p>
            </li>
          {/each}
        </ul>
      </div>

      <div class="column">
        <p class="caption" id="{uid}-compute">Compute</p>
        <div class="segments" role="group" aria-labelledby="{uid}-compute">
          {#each COMPUTE_CHOICES as choice (choice)}
            <button
              class="segment"
              type="button"
              aria-pressed={view.compute === choice}
              onclick={() => pick(choice)}
            >
              {computeChoiceName(choice)}
            </button>
          {/each}
        </div>
        <p class="detected">{computeDetectionNote(view.detection, view.compute)}</p>
        {#if gpuWarning !== null}
          <p class="detected shaky" role="alert">{gpuWarning}</p>
        {/if}
        {#if session !== null}
          <p class="detected">
            This session opened on the {deviceName(session.device)}.
          </p>
        {/if}
      </div>
    </div>

    <div class="storage">
      <p class="caption">Stored on this device</p>
      <p class="measured">
        {storage === null
          ? (view.storageMessage ?? 'Reading what is stored…')
          : storedFigure(storage.report)}
      </p>
      {#if partial !== null}
        <p class="footnote">{partial}</p>
      {/if}
      <p class="footnote">
        This is what the model occupies, not what the app does.
        <a class="link" href="/settings/storage">Storage</a>
        accounts for every megabyte on this device.
      </p>
      {#if storage !== null && !storage.persisted}
        <p class="footnote">
          The browser has not granted persistence, so it may reclaim this space on its own.
        </p>
      {/if}

      <div class="actions">
        {#if !loading && !view.stored && view.resumable}
          <button class="primary" type="button" onclick={() => void view.start()}>
            {resumeLabel(view.partial)}
          </button>
          <button class="quiet" type="button" onclick={() => void view.stop()}>
            Discard what was fetched
          </button>
        {/if}
        {#if !loading && !view.stored && !view.resumable}
          <button class="primary" type="button" onclick={() => void view.start()}>
            Download now
          </button>
        {/if}
        {#if view.stored && !view.confirmingRemoval}
          <button
            class="danger"
            type="button"
            disabled={view.removing}
            onclick={() => view.askRemoval()}
          >
            {view.removing ? 'Deleting…' : 'Delete the model'}
          </button>
        {/if}
      </div>

      {#if view.confirmingRemoval}
        <div class="confirm">
          <p class="warning">
            Delete about {storage === null ? downloadMb(model) : megabytes(storage.report.bytes)}
            MB of weights? {REMOVAL_WARNING}
          </p>
          <div class="actions">
            <button class="quiet" type="button" onclick={() => view.dismissRemoval()}>
              Keep it
            </button>
            <button class="danger" type="button" onclick={() => void view.remove()}>
              Delete the model
            </button>
          </div>
        </div>
      {/if}

      {#if failure !== null}
        <p class="warning" role="alert">The model could not be loaded: {failure}</p>
      {/if}
      {#if view.message !== null}
        <p class="footnote" role="status">{view.message}</p>
      {/if}
    </div>
  </section>

  {#each absent as offered (offered.id)}
    <section class="card unbuilt" aria-labelledby="{uid}-{offered.id}">
      <div class="banner plain">
        <div class="who">
          <input
            class="pick"
            type="radio"
            name="{uid}-engine-choice"
            value={offered.id}
            disabled
            aria-labelledby="{uid}-{offered.id}"
          />
          <h2 class="who-name" id="{uid}-{offered.id}">{offered.name}</h2>
          <span class="badge plain">{offered.kind}</span>
          <EngineTrade engine={offered} {model} />
        </div>
        <p class="who-note">{offered.summary}</p>
        <p class="status quiet">
          <span class="dot" aria-hidden="true"></span>
          {NOT_INSTALLED.label}
        </p>
        <p class="who-note said">{NOT_INSTALLED.note}</p>
      </div>
    </section>
  {/each}
{/if}

<style>
  .caption {
    margin: 0;
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .head {
    flex: none;
    padding: var(--s-5) var(--s-6) var(--s-4);
    border-bottom: 1px solid var(--c-border-1);
  }

  .title {
    margin: 0;
    color: var(--c-text-1);
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .lead {
    max-width: 620px;
    margin: var(--s-1) 0 0;
    color: var(--c-text-7);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .notice {
    margin: var(--s-5) var(--s-6);
    color: var(--c-text-7);
    font-size: 12.5px;
  }

  .card {
    margin: var(--s-4) var(--s-6) 0;
    overflow: hidden;
    border: 1px solid var(--c-border-6);
    border-radius: var(--r-6);
    background: var(--c-surface-card-quiet);
  }

  .card:last-of-type {
    margin-bottom: var(--s-6);
  }

  .card.unbuilt {
    border-color: var(--c-border-3);
    background: var(--c-surface-chip);
  }

  .banner {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--s-1) var(--s-3);
    padding: var(--s-3) var(--s-4);
    background: var(--c-accent-wash-faint);
  }

  .banner.plain {
    background: transparent;
  }

  .pick {
    flex: none;
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: var(--c-accent);
  }

  .pick:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .who {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }

  .who-name {
    margin: 0;
    color: var(--c-text-1);
    font-size: 14px;
    font-weight: 500;
  }

  .badge {
    padding: 2px 7px;
    border-radius: var(--r-1);
    background: var(--c-accent-wash-strong);
    color: var(--c-accent);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .badge.plain {
    background: var(--c-surface-button);
    color: var(--c-text-7);
  }

  .who-note {
    grid-column: 1;
    margin: 0;
    max-width: 640px;
    color: var(--c-text-7);
    font-size: 12px;
    line-height: 1.5;
  }

  .who-note.said {
    grid-column: 1 / -1;
    color: var(--c-text-9);
    font-size: 11px;
  }

  .status {
    grid-row: 1;
    grid-column: 2;
    display: flex;
    align-items: center;
    gap: var(--s-1);
    margin: 0;
    font-family: var(--f-mono);
    font-size: 10.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .status .dot {
    display: block;
    width: 6px;
    height: 6px;
    border-radius: var(--r-pill);
    background: currentcolor;
  }

  .status.ready {
    color: var(--c-accent);
  }

  .status.busy {
    color: var(--c-warning);
  }

  .status.quiet {
    color: var(--c-text-8);
  }

  .status.bad {
    color: var(--c-error);
  }

  .progress {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-4);
    border-top: 1px solid var(--c-border-2);
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }

  .label {
    flex: 1 1 auto;
    color: var(--c-text-4);
    font-size: 12px;
  }

  .figure {
    flex: none;
    color: var(--c-text-7);
    font-family: var(--f-mono);
    font-size: 10.5px;
  }

  .track {
    position: relative;
    height: 5px;
    overflow: hidden;
    border-radius: var(--r-2);
    background: var(--c-surface-button);
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    display: block;
    background: var(--c-accent);
  }

  .hint {
    flex: 1 1 auto;
    color: var(--c-text-9);
    font-size: 11px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-4);
    padding: var(--s-4);
    border-top: 1px solid var(--c-border-2);
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    min-width: 0;
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .choice {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-3);
    background: var(--c-surface-chip);
    cursor: pointer;
  }

  .choice.on {
    border-color: var(--c-accent-line);
    background: var(--c-surface-card-active);
  }

  .choice input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .choice:has(input:focus-visible) {
    outline: 1px solid var(--c-accent-border-strong);
    outline-offset: 1px;
  }

  .choice-name {
    flex: 1 1 auto;
    color: var(--c-text-2);
    font-size: 12px;
  }

  .choice-note {
    flex: none;
    color: var(--c-text-8);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .link {
    color: var(--c-accent);
  }

  .footnote {
    margin: 0;
    color: var(--c-text-9);
    font-size: 10.5px;
    line-height: 1.5;
  }

  .segments {
    display: flex;
    gap: var(--s-1);
  }

  .segment {
    flex: 1 1 0;
    padding: var(--s-2) 0;
    border: 1px solid var(--c-border-3);
    border-radius: var(--r-3);
    background: var(--c-surface-chip);
    color: var(--c-text-6);
    font-family: var(--f-ui);
    font-size: 11.5px;
    cursor: pointer;
  }

  .segment:hover,
  .segment:focus-visible {
    border-color: var(--c-accent-border);
    color: var(--c-accent);
  }

  .segment[aria-pressed='true'] {
    border-color: var(--c-accent-line);
    background: var(--c-surface-card-active);
    color: var(--c-accent);
  }

  .shaky {
    border-color: var(--c-warning-border);
    background: var(--c-warning-wash-faint);
    color: var(--c-warning-text);
  }

  .detected {
    margin: 0;
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border-2);
    border-radius: var(--r-3);
    background: var(--c-surface-chip);
    color: var(--c-text-8);
    font-size: 11px;
    line-height: 1.5;
  }

  .storage {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-4);
    border-top: 1px solid var(--c-border-2);
  }

  .measured {
    margin: 0;
    color: var(--c-text-2);
    font-family: var(--f-mono);
    font-size: 13px;
  }

  .actions {
    display: flex;
    gap: var(--s-2);
    margin-top: var(--s-1);
  }

  .primary,
  .quiet,
  .danger {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-2);
    font-family: var(--f-ui);
    font-size: 11.5px;
    cursor: pointer;
  }

  .primary {
    border: 1px solid var(--c-accent);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-weight: 600;
  }

  .quiet {
    border: 1px solid var(--c-border-4);
    background: var(--c-surface-button);
    color: var(--c-text-5);
  }

  .danger {
    border: 1px solid var(--c-error);
    background: transparent;
    color: var(--c-error);
  }

  .danger:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .confirm {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-3);
    border: 1px solid var(--c-warning-border);
    border-radius: var(--r-3);
    background: var(--c-warning-wash-faint);
  }

  .warning {
    margin: 0;
    color: var(--c-warning-text-soft);
    font-size: 11.5px;
    line-height: 1.5;
  }

  @media (max-width: 860px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
