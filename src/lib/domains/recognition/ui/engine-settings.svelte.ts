import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { describeCause } from '$lib/shared/cause';
import { LANGUAGES, type Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type { ComputeChoice, GpuDetection } from '../domain/compute-choice';
import { GPU_UNDETECTED } from '../domain/compute-choice';
import { isPartlyStored, isStored, type ModelStorageReport } from '../domain/model-cache';
import { isPartlyDownloaded, type PartialReport } from '../domain/model-partial';
import {
  downloadStep,
  IDLE,
  type DownloadEvent,
  type DownloadState,
} from '../domain/model-download';
import type { ModelLoad } from '../domain/model-load';
import { megabytes, modelsFor, storedSize, type ModelFootprint } from '../domain/model-footprint';
import type { ModelStorageError } from '../domain/model-storage';
import type { EngineState } from '../domain/ocr-engine';
import type { RecognizerSession } from '../domain/recognizer-session';
import type { ModelStorageSnapshot } from '../use-cases/read-model-storage';

const FULL_PERCENT = 100;

export const REMOVAL_WARNING =
  'The next selection you read downloads it again. Nothing else is deleted.';

export function storageFailureNote(error: ModelStorageError): string {
  return match(error)
    .with(
      { kind: 'cache-unavailable' },
      () => 'This browser exposes no cache, so what the model occupies cannot be read.',
    )
    .with({ kind: 'cache-failed' }, (failed) => `The cache could not be read: ${failed.cause}`)
    .exhaustive();
}

export function loadFigure(load: ModelLoad | null): string {
  if (load === null) return 'starting…';

  const percent = Math.round(load.fraction * FULL_PERCENT);
  if (load.totalBytes <= 0) return `${percent}%`;

  return `${megabytes(load.loadedBytes)} / ${megabytes(load.totalBytes)} MB · ${percent}%`;
}

export function cancelHint(load: ModelLoad | null): string {
  return load?.source === 'network'
    ? 'Pausing keeps every byte already fetched, even if you close the app. Cancelling discards the part-downloaded file.'
    : 'The weights stay on this device. Cancelling only stops opening them.';
}

export function partialFigure(partial: PartialReport | null): string | null {
  if (partial === null || !isPartlyDownloaded(partial)) return null;

  const files = `${partial.files} ${partial.files === 1 ? 'file' : 'files'}`;
  return `${megabytes(partial.bytes)} MB of ${files} part-downloaded, kept for a resume`;
}

export function resumeLabel(partial: PartialReport | null): string {
  return partial !== null && isPartlyDownloaded(partial)
    ? `Resume the download · ${megabytes(partial.bytes)} MB already here`
    : 'Resume the download';
}

export function storedFigure(report: ModelStorageReport): string {
  if (report.files === 0) return 'Not downloaded';

  const files = `${report.files} ${report.files === 1 ? 'file' : 'files'}`;
  const unsized = report.unsized > 0 ? `, ${report.unsized} of unreported size` : '';
  const held = `${storedSize(report.bytes)} in ${files}${unsized}`;

  return isStored(report) ? held : `${held}, but not the weights`;
}

export function engineLanguages(): readonly Language[] {
  return LANGUAGES.filter((language) => modelsFor(language).length > 0);
}

export class EngineSettingsView {
  language = $state.raw<Language | null>(null);
  models = $state.raw<readonly ModelFootprint[]>([]);
  selected = $state.raw<string | null>(null);
  compute = $state.raw<ComputeChoice>('auto');
  detection = $state.raw<GpuDetection>(GPU_UNDETECTED);
  storage = $state.raw<ModelStorageSnapshot | null>(null);
  storageMessage = $state.raw<string | null>(null);
  download = $state.raw<DownloadState>(IDLE);
  session = $state.raw<RecognizerSession | null>(null);
  removing = $state(false);
  confirmingRemoval = $state(false);
  message = $state.raw<string | null>(null);

  #container: Container;
  #generation = 0;

  constructor(container: Container) {
    this.#container = container;
  }

  get model(): ModelFootprint | null {
    return this.models.find((known) => known.modelId === this.selected) ?? this.models[0] ?? null;
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
    const language = engineLanguages()[0] ?? null;
    this.language = language;
    this.models = language === null ? [] : modelsFor(language);
    if (language === null) return;

    const [choice, detected] = await Promise.all([
      this.#container.recognition.readRecognizerSetup(language),
      this.#container.recognition.detectCompute(),
    ]);

    if (generation !== this.#generation) return;

    if (choice.ok) {
      this.selected = choice.value.model?.modelId ?? null;
      this.compute = choice.value.compute;
    }
    this.detection = detected;

    await this.measure(generation);
  }

  dispose(): void {
    this.#bump();
  }

  async chooseModel(modelId: string): Promise<void> {
    if (this.selected === modelId) return;

    const abandoned = this.model;
    this.selected = modelId;
    await this.#applySetup(abandoned?.modelId ?? null);
  }

  async chooseCompute(compute: ComputeChoice): Promise<void> {
    if (this.compute === compute) return;

    this.compute = compute;
    await this.#applySetup(null);
  }

  async start(): Promise<void> {
    const language = this.language;
    if (language === null || this.download.kind === 'loading') return;

    const generation = this.#bump();
    this.message = null;
    this.#step({ kind: 'started' });

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
      this.message = removed.ok
        ? `Freed ${megabytes(removed.value.bytes)} MB. ${REMOVAL_WARNING}`
        : storageFailureNote(removed.error);
    } catch (cause) {
      if (generation === this.#generation) {
        this.message = `The model could not be removed: ${describeCause(cause)}`;
      }
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
    const language = this.language;
    const model = this.model;
    if (language === null || model === null) return;

    const generation = this.#bump();
    this.session = null;
    this.download = IDLE;

    await this.#container.recognition.saveRecognizerSetup(language, {
      modelId: model.modelId,
      compute: this.compute,
    });

    if (abandoned === null) await this.#container.recognition.pauseModelLoad(language);
    else await this.#container.recognition.cancelModelLoad(language, abandoned);

    if (generation !== this.#generation) return;
    await this.measure(generation);
  }

  #step(event: DownloadEvent): void {
    this.download = downloadStep(this.download, event);
  }

  #bump(): number {
    this.#generation += 1;
    return this.#generation;
  }
}
