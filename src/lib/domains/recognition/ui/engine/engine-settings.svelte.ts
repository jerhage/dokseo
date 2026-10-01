import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { megabytes, storedSize } from '$lib/shared/bytes';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import type { ComputeChoice } from '../../domain/engine/compute-choice';
import { isStored } from '../../domain/model/model-cache';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { PartialReport } from '../../domain/model/model-partial';
import type { ModelLoad } from '../../domain/model/model-load';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { SetupError } from '../../domain/engine/recognizer-setup';
import type { EngineState } from '../../domain/engine/ocr-engine';
import { EngineSetup, shownModel } from './engine-setup.svelte';
import { ModelDownload } from './model-download.svelte';
import { ModelRemoval } from './model-removal.svelte';
import { ModelStorage } from './model-storage.svelte';
import { OperationClock } from './operation-clock';

const FULL_PERCENT = 100;

const SETUP_FAILED = 'Could not save the engine choice';

function setupFailureNote(error: SetupError): string {
  return match(error)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so the choice was not kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
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
  readonly setup: EngineSetup;
  readonly storage: ModelStorage;
  readonly download: ModelDownload;
  readonly removal: ModelRemoval;

  #container: Container;
  #notify: Notify;
  #clock = new OperationClock();

  constructor(container: Container, notify: Notify) {
    this.#container = container;
    this.#notify = notify;
    this.setup = new EngineSetup(container, () => this.#clock.current);
    this.storage = new ModelStorage(container, this.#clock);
    this.download = new ModelDownload(container, notify, this.#clock);
    this.removal = new ModelRemoval(container, notify, this.#clock, {
      stored: () => this.storage.stored,
      settled: () => this.download.reset(),
    });
  }

  get language(): Language | null {
    return this.setup.choice?.language ?? null;
  }

  get model(): ModelFootprint | null {
    return this.setup.model;
  }

  get engine(): EngineState {
    const download = this.download.state;
    return {
      stored: this.storage.stored,
      opening: download.kind === 'loading',
      load: download.kind === 'loading' ? download.load : null,
      session: download.kind === 'ready' ? download.session : this.download.session,
      failure: download.kind === 'failed' ? download.cause : null,
      paused: download.kind === 'paused',
      cancelled: download.kind === 'cancelled',
      partlyDownloaded: this.storage.resumable,
    };
  }

  async load(): Promise<void> {
    const generation = this.#clock.next();
    await this.setup.load(generation);
    await this.storage.measure(this.model, generation);
  }

  async chooseLanguage(language: Language): Promise<void> {
    if (this.setup.language === language) return;

    this.setup.language = language;
    this.download.reset();
    this.storage.forget();
    this.removal.forget();

    await this.load();
  }

  dispose(): void {
    this.#clock.next();
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
    if (language === null || this.download.loading) return;

    const generation = this.#clock.next();
    this.removal.clearMessage();
    const settled = await this.download.start(language, generation);
    if (settled) await this.storage.measure(this.model, generation);
  }

  async pause(): Promise<void> {
    const language = this.language;
    if (language === null || !this.download.loading) return;

    const generation = this.#clock.next();
    await this.download.pause(language);
    await this.storage.measure(this.model, generation);
  }

  async stop(): Promise<void> {
    const language = this.language;
    const model = this.model;
    if (language === null || model === null) return;

    const generation = this.#clock.next();
    await this.download.stop(language, model.modelId);
    await this.storage.measure(model, generation);
  }

  async remove(): Promise<void> {
    const language = this.language;
    const model = this.model;
    this.removal.dismiss();
    if (language === null || model === null || this.removal.removing) return;

    const generation = this.#clock.next();
    await this.removal.remove(language, model.modelId, generation);
    await this.storage.measure(model, generation);
  }

  async #applySetup(abandoned: string | null): Promise<void> {
    const choice = this.setup.choice;
    if (choice === null) return;

    const language = choice.language;
    const model = shownModel(choice);
    const generation = this.#clock.next();
    this.download.reset();

    const saved = await this.#container.recognition.saveRecognizerSetup(language, {
      modelId: model.modelId,
      compute: choice.compute,
    });
    if (!saved.ok && generation === this.#clock.current) {
      this.#notify({ tone: 'danger', title: SETUP_FAILED, message: setupFailureNote(saved.error) });
    }

    if (abandoned === null) await this.#container.recognition.pauseModelLoad(language);
    else await this.#container.recognition.cancelModelLoad(language, abandoned);

    await this.#container.recognition.closeRecognizer(language);

    if (generation !== this.#clock.current) return;
    await this.storage.measure(model, generation);
  }
}

export {
  SETUP_FAILED,
  loadFigure,
  cancelHint,
  partialFigure,
  resumeLabel,
  storedFigure,
  EngineSettingsView,
};
