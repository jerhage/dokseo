import type { QueryClient } from '@tanstack/svelte-query';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { downloadStep, IDLE } from '../../domain/model/model-download';
import type { DownloadEvent, DownloadState } from '../../domain/model/model-download';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import {
  cancelDownloadMutation,
  grantConsentMutation,
  pauseDownloadMutation,
  prepareRecognizerMutation,
} from '../../queries/engine-queries';
import type { DownloadRequest, EngineWrites, ModelTarget } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { PrepareRecognizerResult } from '../../use-cases/engine/prepare-recognizer';
import type { CancelModelLoadResult } from '../../use-cases/model/cancel-model-load';
import type { GrantModelConsentResult } from '../../use-cases/model/grant-model-consent';
import type { OperationClock } from './operation-clock';

const LOAD_FAILED = 'Could not load the model';

class ModelDownload {
  state = $state.raw<DownloadState>(IDLE);
  session = $state.raw<RecognizerSession | null>(null);

  #notify: Notify;
  #clock: OperationClock;
  #granting: WriteQuery<GrantModelConsentResult, Language>;
  #preparing: WriteQuery<PrepareRecognizerResult, DownloadRequest>;
  #pausing: WriteQuery<void, Language>;
  #cancelling: WriteQuery<CancelModelLoadResult | null, ModelTarget>;

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

    await this.#granting.run(language).catch(() => null);
    if (generation !== this.#clock.current) return false;

    const opened = await this.#preparing.run({
      language,
      onProgress: (load) => {
        if (generation === this.#clock.current) this.#step({ kind: 'advanced', load });
      },
    });

    if (generation !== this.#clock.current) return false;

    if (opened.kind === 'success') {
      this.session = opened.session;
      this.#step({ kind: 'opened', session: opened.session });
    } else {
      this.#step({ kind: 'settled', error: opened });
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
    await this.#cancelling.run({ language, modelId }).catch(() => null);
  }

  #step(event: DownloadEvent): void {
    this.state = downloadStep(this.state, event);
  }
}

export { LOAD_FAILED, ModelDownload };
