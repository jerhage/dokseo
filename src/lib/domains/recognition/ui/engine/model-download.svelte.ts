import type { Container } from '$lib/container';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import { downloadStep, IDLE } from '../../domain/model/model-download';
import type { DownloadEvent, DownloadState } from '../../domain/model/model-download';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { OperationClock } from './operation-clock';

const LOAD_FAILED = 'Could not load the model';

class ModelDownload {
  state = $state.raw<DownloadState>(IDLE);
  session = $state.raw<RecognizerSession | null>(null);

  #container: Container;
  #notify: Notify;
  #clock: OperationClock;

  constructor(container: Container, notify: Notify, clock: OperationClock) {
    this.#container = container;
    this.#notify = notify;
    this.#clock = clock;
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

    await this.#container.recognition.grantModelConsent(language);
    if (generation !== this.#clock.current) return false;

    const opened = await this.#container.recognition.prepareRecognizer(language, {
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
    await this.#container.recognition.pauseModelLoad(language);
  }

  async stop(language: Language, modelId: string): Promise<void> {
    this.#step({ kind: 'stopped' });
    this.session = null;
    await this.#container.recognition.cancelModelLoad(language, modelId);
  }

  #step(event: DownloadEvent): void {
    this.state = downloadStep(this.state, event);
  }
}

export { LOAD_FAILED, ModelDownload };
