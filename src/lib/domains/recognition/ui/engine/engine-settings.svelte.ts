import type { QueryClient } from '@tanstack/svelte-query';
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
import type { LanguageSetup } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { engineLanguages, shownModel } from './engine-setup.svelte';
import { ModelDownload } from './model-download.svelte';
import { ModelRemoval } from './model-removal.svelte';
import { isModelStored, isResumable } from './model-storage.svelte';
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
  readonly download: ModelDownload;
  readonly removal: ModelRemoval;
  language = $state.raw<Language | null>(engineLanguages()[0] ?? null);

  #container: Container;
  #notify: Notify;
  #client: QueryClient;
  #clock = new OperationClock();

  constructor(container: Container, notify: Notify, client: QueryClient) {
    this.#container = container;
    this.#notify = notify;
    this.#client = client;
    this.download = new ModelDownload(container, notify, this.#clock);
    this.removal = new ModelRemoval(container, notify, this.#clock, {
      settled: () => this.download.reset(),
    });
  }

  engine(storage: ModelStorageSnapshot | null): EngineState {
    const download = this.download.state;
    return {
      stored: isModelStored(storage),
      opening: download.kind === 'loading',
      load: download.kind === 'loading' ? download.load : null,
      session: download.kind === 'ready' ? download.session : this.download.session,
      failure: download.kind === 'failed' ? download.cause : null,
      paused: download.kind === 'paused',
      cancelled: download.kind === 'cancelled',
      partlyDownloaded: isResumable(storage),
    };
  }

  chooseLanguage(language: Language): void {
    if (this.language === language) return;

    this.language = language;
    this.#clock.next();
    this.download.reset();
    this.removal.forget();
  }

  dispose(): void {
    this.#clock.next();
  }

  async chooseModel(choice: LanguageSetup, modelId: string): Promise<void> {
    if (choice.selected === modelId) return;

    const abandoned = shownModel(choice);
    await this.#applySetup({ ...choice, selected: modelId }, abandoned.modelId);
  }

  async chooseCompute(choice: LanguageSetup, compute: ComputeChoice): Promise<void> {
    if (choice.compute === compute) return;

    await this.#applySetup({ ...choice, compute }, null);
  }

  async start(choice: LanguageSetup): Promise<void> {
    if (this.download.loading) return;

    const generation = this.#clock.next();
    this.removal.clearMessage();
    await this.download.start(choice.language, generation);
    await this.#refreshStorage(shownModel(choice), generation);
  }

  async pause(choice: LanguageSetup): Promise<void> {
    if (!this.download.loading) return;

    const generation = this.#clock.next();
    await this.download.pause(choice.language);
    await this.#refreshStorage(shownModel(choice), generation);
  }

  async stop(choice: LanguageSetup): Promise<void> {
    const model = shownModel(choice);
    const generation = this.#clock.next();
    await this.download.stop(choice.language, model.modelId);
    await this.#refreshStorage(model, generation);
  }

  async remove(choice: LanguageSetup): Promise<void> {
    this.removal.dismiss();
    if (this.removal.removing) return;

    const model = shownModel(choice);
    const generation = this.#clock.next();
    await this.removal.remove(choice.language, model.modelId, generation);
    await this.#refreshStorage(model, generation);
  }

  async #applySetup(choice: LanguageSetup, abandoned: string | null): Promise<void> {
    const language = choice.language;
    const model = shownModel(choice);
    const generation = this.#clock.next();
    this.download.reset();

    const setupKey = recognitionKeys.setup(language);
    await this.#client.cancelQueries({ queryKey: setupKey });
    this.#client.setQueryData<LanguageSetup>(setupKey, {
      language,
      models: choice.models,
      selected: choice.selected,
      compute: choice.compute,
    });

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

    await this.#refreshStorage(model, generation);
  }

  async #refreshStorage(model: ModelFootprint, generation: number): Promise<void> {
    if (generation !== this.#clock.current) return;
    await this.#client.invalidateQueries({ queryKey: recognitionKeys.modelStorage(model.modelId) });
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
