import type { QueryClient } from '@tanstack/svelte-query';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { downloadStep, IDLE } from '../../domain/model/model-download';
import type { DownloadEvent, DownloadState } from '../../domain/model/model-download';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { ModelConsentError } from '../../domain/model/model-consent';
import type { ModelLoadError } from '../../domain/model/model-load';
import type { PartialReport } from '../../domain/model/model-partial';
import type { PartialError } from '../../domain/model/partial-downloads';
import {
  cancelDownloadMutation,
  grantConsentMutation,
  pauseDownloadMutation,
  prepareRecognizerMutation,
} from '../../queries/engine-queries';
import type { DownloadRequest, EngineWrites, ModelTarget } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { OperationClock } from './operation-clock';

const LOAD_FAILED = 'Could not load the model';

class ModelDownload {
  state = $state.raw<DownloadState>(IDLE);
  session = $state.raw<RecognizerSession | null>(null);

  #notify: Notify;
  #clock: OperationClock;
  #granting: WriteQuery<Result<void, ModelConsentError>, Language>;
  #preparing: WriteQuery<Result<RecognizerSession, ModelLoadError>, DownloadRequest>;
  #pausing: WriteQuery<void, Language>;
  #cancelling: WriteQuery<Result<PartialReport, PartialError> | null, ModelTarget>;

  constructor(
    recognition: Pick<
      EngineWrites,
      'grantModelConsent' | 'prepareRecognizer' | 'pauseModelLoad' | 'cancelModelLoad'
    >,
    notify: Notify,
    clock: OperationClock,
    client: QueryClient,
  ) {
    this.#notify = notify;
    this.#clock = clock;
    const refreshStorage = () =>
      client.invalidateQueries({ queryKey: recognitionKeys.modelStorages() });
    this.#granting = writeQuery(() => ({
      ...grantConsentMutation(recognition),
      onSettled: (_granted, _cause, language) =>
        client.invalidateQueries({ queryKey: recognitionKeys.consent(language) }),
    }));
    this.#preparing = writeQuery(() => ({
      ...prepareRecognizerMutation(recognition),
      onSettled: refreshStorage,
    }));
    this.#pausing = writeQuery(() => ({
      ...pauseDownloadMutation(recognition),
      onSettled: refreshStorage,
    }));
    this.#cancelling = writeQuery(() => ({
      ...cancelDownloadMutation(recognition),
      onSettled: refreshStorage,
    }));
  }

  get loading(): boolean {
    return this.state.kind === 'loading';
  }

  reset(): void {
    this.session = null;
    this.state = IDLE;
  }

  async start(language: Language, generation: number): Promise<boolean> {
    this.#step({ kind: 'started' });

    await this.#granting.run(language);
    if (generation !== this.#clock.current) return false;

    const opened = await this.#preparing.run({
      language,
      onProgress: (load) => {
        if (generation === this.#clock.current) this.#step({ kind: 'advanced', load });
      },
    });

    if (generation !== this.#clock.current) return false;

    if (opened.ok) {
      this.session = opened.value;
      this.#step({ kind: 'opened', session: opened.value });
    } else {
      this.#step({ kind: 'settled', error: opened.error });
      const settled = this.state;
      if (settled.kind === 'failed') {
        this.#notify({ tone: 'danger', title: LOAD_FAILED, message: settled.cause });
      }
    }
    return true;
  }

  async pause(language: Language): Promise<void> {
    this.#step({ kind: 'held' });
    this.session = null;
    await this.#pausing.run(language);
  }

  async stop(language: Language, modelId: string): Promise<void> {
    this.#step({ kind: 'stopped' });
    this.session = null;
    await this.#cancelling.run({ language, modelId });
  }

  #step(event: DownloadEvent): void {
    this.state = downloadStep(this.state, event);
  }
}

export { LOAD_FAILED, ModelDownload };
