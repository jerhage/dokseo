import type { QueryClient } from '@tanstack/svelte-query';
import type { Container } from '$lib/container';
import { megabytes, storedSize } from '$lib/shared/bytes';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { ComputeChoice } from '../../domain/engine/compute-choice';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import { isStored } from '../../domain/model/model-cache';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { PartialReport } from '../../domain/model/model-partial';
import type { DownloadState } from '../../domain/model/model-download';
import type { ModelLoad } from '../../domain/model/model-load';
import type { EngineState } from '../../domain/engine/ocr-engine';
import { saveSetupMutation } from '../../queries/engine-queries';
import type { LanguageSetup, LanguageSetupRead, SetupChange } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { SaveRecognizerSetupResult } from '../../use-cases/engine/save-recognizer-setup';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { firstEngineLanguage, shownModel } from './engine-setup';
import { ModelDownload } from './model-download.svelte';
import { ModelRemoval } from './model-removal.svelte';
import { isModelStored, isResumable } from './model-storage';
import { OperationClock } from './operation-clock';

const FULL_PERCENT = 100;

const SETUP_FAILED = 'Could not save the engine choice';

const SETUP_UNKEPT = 'This browser blocks local storage, so the choice was not kept.';

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

function engineStateOf(
  download: DownloadState,
  session: RecognizerSession | null,
  storage: ModelStorageSnapshot | null,
): EngineState {
  return {
    stored: isModelStored(storage),
    opening: download.kind === 'loading',
    load: download.kind === 'loading' ? download.load : null,
    session: download.kind === 'ready' ? download.session : session,
    failure: download.kind === 'failed' ? download.cause : null,
    paused: download.kind === 'paused',
    cancelled: download.kind === 'cancelled',
    partlyDownloaded: isResumable(storage),
  };
}

class EngineSettingsView {
  readonly download: ModelDownload;
  readonly removal: ModelRemoval;
  language = $state.raw<Language>(firstEngineLanguage());

  #notify: Notify;
  #clock = new OperationClock();
  #saving: WriteQuery<SaveRecognizerSetupResult, SetupChange>;

  constructor(container: Container, notify: Notify, client: QueryClient) {
    const recognition = container.recognition;
    this.#notify = notify;
    this.download = new ModelDownload(recognition, notify, this.#clock, client);
    this.removal = new ModelRemoval(
      recognition,
      notify,
      this.#clock,
      { settled: () => this.download.reset() },
      client,
    );
    this.#saving = writeQuery(() => ({
      ...saveSetupMutation(recognition),
      onMutate: async ({ setup }) => {
        const queryKey = recognitionKeys.setup(setup.language);
        await client.cancelQueries({ queryKey });
        const held: LanguageSetupRead = { kind: 'success', setup };
        client.setQueryData<LanguageSetupRead>(queryKey, held);
      },
      onError: (cause) =>
        this.#notify({ tone: 'danger', title: SETUP_FAILED, message: failureMessage(cause) }),
      onSettled: (_saved, _cause, { modelId }) =>
        client.invalidateQueries({ queryKey: recognitionKeys.modelStorage(modelId) }),
    }));
  }

  engine(storage: ModelStorageSnapshot | null): EngineState {
    return engineStateOf(this.download.state, this.download.session, storage);
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
  }

  async pause(choice: LanguageSetup): Promise<void> {
    if (!this.download.loading) return;

    this.#clock.next();
    await this.download.pause(choice.language);
  }

  async stop(choice: LanguageSetup): Promise<void> {
    this.#clock.next();
    await this.download.stop(choice.language, shownModel(choice).modelId);
  }

  async remove(choice: LanguageSetup): Promise<void> {
    this.removal.dismiss();
    if (this.removal.removing) return;

    const generation = this.#clock.next();
    await this.removal.remove(choice.language, shownModel(choice).modelId, generation);
  }

  async #applySetup(choice: LanguageSetup, abandoned: string | null): Promise<void> {
    const generation = this.#clock.next();
    this.download.reset();

    const setup = {
      language: choice.language,
      models: choice.models,
      selected: choice.selected,
      compute: choice.compute,
    };
    const saved = await this.#saving
      .run({ setup, modelId: shownModel(choice).modelId, abandoned })
      .catch(() => null);
    if (saved === null) return;
    if (saved.kind !== 'success' && generation === this.#clock.current) {
      this.#notify({ tone: 'danger', title: SETUP_FAILED, message: SETUP_UNKEPT });
    }
  }
}

export {
  SETUP_FAILED,
  SETUP_UNKEPT,
  engineStateOf,
  loadFigure,
  cancelHint,
  partialFigure,
  resumeLabel,
  storedFigure,
  EngineSettingsView,
};
