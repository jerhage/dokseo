import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { megabytes, storedSize } from '$lib/shared/bytes';
import { describeCause } from '$lib/shared/cause';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import type { ComputeChoice } from '../../domain/engine/compute-choice';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { PartialReport } from '../../domain/model/model-partial';
import { downloadStep, IDLE } from '../../domain/model/model-download';
import type { DownloadEvent, DownloadState } from '../../domain/model/model-download';
import type { ModelLoad } from '../../domain/model/model-load';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { ModelStorageError } from '../../domain/model/model-storage';
import type { SetupError } from '../../domain/engine/recognizer-setup';
import type { EngineState } from '../../domain/engine/ocr-engine';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { EngineSetup, shownModel } from './engine-setup.svelte';

const FULL_PERCENT = 100;

const REMOVAL_WARNING = 'The next selection you read downloads it again. Nothing else is deleted.';

const SETUP_FAILED = 'Could not save the engine choice';

const LOAD_FAILED = 'Could not load the model';

const REMOVE_FAILED = 'Could not delete the model';

function setupFailureNote(error: SetupError): string {
  return match(error)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so the choice was not kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function storageFailureNote(error: ModelStorageError): string {
  return match(error)
    .with(
      { kind: 'cache-unavailable' },
      () => 'This browser exposes no cache, so what the model occupies cannot be read.',
    )
    .with({ kind: 'cache-failed' }, (failed) => `The cache could not be read: ${failed.cause}`)
    .exhaustive();
}

function loadFigure(load: ModelLoad | null): string {
  if (load === null) return 'starting…';

  const percent = Math.round(load.fraction * FULL_PERCENT);
  if (load.totalBytes <= 0) return `${percent}%`;

  return `${megabytes(load.loadedBytes)} / ${megabytes(load.totalBytes)} MB · ${percent}%`;
}

function cancelHint(load: ModelLoad | null): string {
  return load?.source === 'network'
    ? 'Pausing keeps every byte already fetched, even if you close the app. Cancelling discards the part-downloaded file.'
    : 'The weights stay on this device. Cancelling only stops opening them.';
}

function partialFigure(partial: PartialReport | null, stored = false): string | null {
  if (partial === null || !isPartlyDownloaded(partial)) return null;

  const files = `${partial.files} ${partial.files === 1 ? 'file' : 'files'}`;
  const held = `${megabytes(partial.bytes)} MB of ${files} part-downloaded`;

  return stored
    ? `${held}, left over from an earlier download and no longer needed`
    : `${held}, kept for a resume`;
}

function resumeLabel(partial: PartialReport | null): string {
  return partial !== null && isPartlyDownloaded(partial)
    ? `Resume the download · ${megabytes(partial.bytes)} MB already here`
    : 'Resume the download';
}

function storedFigure(report: ModelStorageReport): string {
  if (report.files === 0) return 'Not downloaded';

  const files = `${report.files} ${report.files === 1 ? 'file' : 'files'}`;
  const unsized = report.unsized > 0 ? `, ${report.unsized} of unreported size` : '';
  const held = `${storedSize(report.bytes)} in ${files}${unsized}`;

  return isStored(report) ? held : `${held}, but not the weights`;
}

class EngineSettingsView {
  storage = $state.raw<ModelStorageSnapshot | null>(null);
  storageMessage = $state.raw<string | null>(null);
  download = $state.raw<DownloadState>(IDLE);
  session = $state.raw<RecognizerSession | null>(null);
  removing = $state(false);
  confirmingRemoval = $state(false);
  message = $state.raw<string | null>(null);

  readonly setup: EngineSetup;

  #container: Container;
  #notify: Notify;
  #generation = 0;

  constructor(container: Container, notify: Notify) {
    this.#container = container;
    this.#notify = notify;
    this.setup = new EngineSetup(container, () => this.#generation);
  }

  get language(): Language | null {
    return this.setup.choice?.language ?? null;
  }

  get model(): ModelFootprint | null {
    return this.setup.model;
  }

  get stored(): boolean {
    const report = this.storage?.report;
    return report !== undefined && isStored(report);
  }

  get partial(): PartialReport | null {
    return this.storage?.partial ?? null;
  }

  get partlyStored(): boolean {
    const report = this.storage?.report;
    return report !== undefined && isPartlyStored(report);
  }

  get resumable(): boolean {
    return !this.stored && (this.partlyStored || isPartlyDownloaded(this.partial));
  }

  get engine(): EngineState {
    const download = this.download;
    return {
      stored: this.stored,
      opening: download.kind === 'loading',
      load: download.kind === 'loading' ? download.load : null,
      session: download.kind === 'ready' ? download.session : this.session,
      failure: download.kind === 'failed' ? download.cause : null,
      paused: download.kind === 'paused',
      cancelled: download.kind === 'cancelled',
      partlyDownloaded: this.resumable,
    };
  }

  async load(): Promise<void> {
    const generation = this.#bump();
    await this.setup.load(generation);
    await this.measure(generation);
  }

  async chooseLanguage(language: Language): Promise<void> {
    if (this.setup.language === language) return;

    this.setup.language = language;
    this.session = null;
    this.download = IDLE;
    this.storage = null;
    this.storageMessage = null;
    this.message = null;
    this.confirmingRemoval = false;

    await this.load();
  }

  dispose(): void {
    this.#bump();
  }

  async chooseModel(modelId: string): Promise<void> {
    const choice = this.setup.choice;
    if (choice === null || choice.selected === modelId) return;

    const abandoned = shownModel(choice);
    this.setup.select(modelId);
    await this.#applySetup(abandoned.modelId);
  }

  async chooseCompute(compute: ComputeChoice): Promise<void> {
    if (this.setup.choice?.compute === compute) return;

    this.setup.setCompute(compute);
    await this.#applySetup(null);
  }

  async start(): Promise<void> {
    const language = this.language;
    if (language === null || this.download.kind === 'loading') return;

    const generation = this.#bump();
    this.message = null;
    this.#step({ kind: 'started' });

    await this.#container.recognition.grantModelConsent(language);
    if (generation !== this.#generation) return;

    const opened = await this.#container.recognition.prepareRecognizer(language, {
      onProgress: (load) => {
        if (generation === this.#generation) this.#step({ kind: 'advanced', load });
      },
    });

    if (generation !== this.#generation) return;

    if (opened.ok) {
      this.session = opened.value;
      this.#step({ kind: 'opened', session: opened.value });
    } else {
      this.#step({ kind: 'settled', error: opened.error });
      const settled = this.download;
      if (settled.kind === 'failed') this.#fail(LOAD_FAILED, settled.cause);
    }

    await this.measure(generation);
  }

  async pause(): Promise<void> {
    const language = this.language;
    if (language === null || this.download.kind !== 'loading') return;

    const generation = this.#bump();
    this.#step({ kind: 'held' });
    this.session = null;
    await this.#container.recognition.pauseModelLoad(language);
    await this.measure(generation);
  }

  async stop(): Promise<void> {
    const language = this.language;
    const model = this.model;
    if (language === null || model === null) return;

    const generation = this.#bump();
    this.#step({ kind: 'stopped' });
    this.session = null;
    await this.#container.recognition.cancelModelLoad(language, model.modelId);
    await this.measure(generation);
  }

  askRemoval(): void {
    if (!this.stored) return;
    this.confirmingRemoval = true;
  }

  dismissRemoval(): void {
    this.confirmingRemoval = false;
  }

  async remove(): Promise<void> {
    const language = this.language;
    const model = this.model;
    this.confirmingRemoval = false;
    if (language === null || model === null || this.removing) return;

    const generation = this.#bump();
    this.removing = true;
    this.message = null;

    try {
      await this.#container.recognition.cancelModelLoad(language, model.modelId);
      const removed = await this.#container.recognition.deleteModel(language, model.modelId);
      if (generation !== this.#generation) return;

      this.session = null;
      this.download = IDLE;
      if (removed.ok)
        this.message = `Freed ${megabytes(removed.value.bytes)} MB. ${REMOVAL_WARNING}`;
      else this.#fail(REMOVE_FAILED, storageFailureNote(removed.error));
    } catch (cause) {
      if (generation === this.#generation) this.#fail(REMOVE_FAILED, describeCause(cause));
    } finally {
      if (generation === this.#generation) this.removing = false;
    }

    await this.measure(generation);
  }

  async measure(generation: number = this.#generation): Promise<void> {
    const model = this.model;
    if (model === null) return;

    let read: Result<ModelStorageSnapshot, ModelStorageError>;
    try {
      read = await this.#container.recognition.readModelStorage(model.modelId);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.storage = null;
      this.storageMessage = `What the model occupies could not be read: ${describeCause(cause)}`;
      return;
    }

    if (generation !== this.#generation) return;

    if (read.ok) {
      this.storage = read.value;
      this.storageMessage = null;
    } else {
      this.storage = null;
      this.storageMessage = storageFailureNote(read.error);
    }
  }

  async #applySetup(abandoned: string | null): Promise<void> {
    const choice = this.setup.choice;
    if (choice === null) return;

    const language = choice.language;
    const model = shownModel(choice);
    const generation = this.#bump();
    this.session = null;
    this.download = IDLE;

    const saved = await this.#container.recognition.saveRecognizerSetup(language, {
      modelId: model.modelId,
      compute: choice.compute,
    });
    if (!saved.ok && generation === this.#generation) {
      this.#fail(SETUP_FAILED, setupFailureNote(saved.error));
    }

    if (abandoned === null) await this.#container.recognition.pauseModelLoad(language);
    else await this.#container.recognition.cancelModelLoad(language, abandoned);

    await this.#container.recognition.closeRecognizer(language);

    if (generation !== this.#generation) return;
    await this.measure(generation);
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }

  #step(event: DownloadEvent): void {
    this.download = downloadStep(this.download, event);
  }

  #bump(): number {
    this.#generation += 1;
    return this.#generation;
  }
}

export {
  LOAD_FAILED,
  REMOVAL_WARNING,
  REMOVE_FAILED,
  SETUP_FAILED,
  storageFailureNote,
  loadFigure,
  cancelHint,
  partialFigure,
  resumeLabel,
  storedFigure,
  EngineSettingsView,
};
