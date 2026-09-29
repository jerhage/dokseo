import type { Container } from '$lib/container';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import { downloadMb } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { loadVerb } from '../../domain/model/model-load';
import type { ModelLoad } from '../../domain/model/model-load';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { EngineState } from '../../domain/engine/ocr-engine';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { RecognizeRegionError } from '../../use-cases/engine/recognize-region';

const READING_SELECTION = 'Reading the selection.';

const RECOGNITION_OFF = 'Text recognition is off';

const RECOGNITION_OFF_REASON = 'You chose not to download the recognition model.';

const TURN_ON = 'Turn on';

const FULL_PERCENT = 100;

function loadPercent(load: ModelLoad): number {
  return Math.round(load.fraction * FULL_PERCENT);
}

function modelLoadNote(load: ModelLoad): string {
  return `${loadVerb(load.source)} the model · ${loadPercent(load)}%`;
}

function modelLoadAnnouncement(load: ModelLoad | null): string {
  if (load === null) return READING_SELECTION;
  return `${loadVerb(load.source)} the recognition model, ${loadPercent(load)} percent.`;
}

type ConsentRequest = {
  readonly language: Language;
  readonly footprint: ModelFootprint;
};

type PendingRecognition = {
  readonly source: PageSource;
  readonly language: Language;
  readonly regions: readonly ImageRegion[];
  readonly arrangement: Arrangement;
};

type WarmedFor = {
  readonly generation: number;
  readonly language: Language;
};

class RecognizerView {
  progress = $state.raw<ModelLoad | null>(null);
  session = $state.raw<RecognizerSession | null>(null);
  downloaded = $state.raw(false);
  partlyDownloaded = $state.raw(false);
  opening = $state.raw(false);
  engineFailure = $state.raw<string | null>(null);
  consentRequest = $state.raw<ConsentRequest | null>(null);

  #container: Container;
  #notify: Notify;
  #generation: () => number;
  #warmed: WarmedFor | null = null;
  #activeRecognitions = 0;
  #recognizerLanguage: Language | null = null;
  #retiring = new Set<Language>();
  #pendingRecognition: PendingRecognition | null = null;
  #agreed = new Set<Language>();
  #declined = new Set<Language>();
  #toldDeclined = new Set<Language>();

  constructor(container: Container, notify: Notify, generation: () => number) {
    this.#container = container;
    this.#notify = notify;
    this.#generation = generation;
  }

  get engine(): EngineState {
    return {
      stored: this.downloaded,
      opening: this.opening,
      load: this.progress,
      session: this.session,
      failure: this.engineFailure,
      paused: false,
      cancelled: false,
      partlyDownloaded: this.partlyDownloaded,
    };
  }

  async warm(language: Language): Promise<void> {
    const generation = this.#generation();
    const warmed = this.#warmed;
    if (warmed !== null && warmed.generation === generation && warmed.language === language) return;
    this.#warmed = { generation, language };
    this.#switchTo(language);

    const trace = this.#container.beginTrace('engine-warm');
    try {
      const model = await this.#chosenModel(language);
      if (!this.#stillWarming(generation, language)) return;
      if (model === null) {
        trace.step('stopped', { guard: 'no-model-for-language', language });
        return;
      }

      const held = await this.#container.recognition
        .readModelStorage(model.modelId)
        .catch(() => null);
      if (!this.#stillWarming(generation, language)) return;

      const snapshot = held !== null && held.ok ? held.value : null;
      this.downloaded = snapshot !== null && isStored(snapshot.report);
      this.partlyDownloaded =
        snapshot !== null &&
        !this.downloaded &&
        (isPartlyStored(snapshot.report) || isPartlyDownloaded(snapshot.partial));
      if (!this.downloaded) {
        trace.step('stopped', { guard: 'weights-not-on-disk', modelId: model.modelId });
        return;
      }

      this.#agreed.add(language);
      trace.step('opening', { language, modelId: model.modelId });
      await this.#openEngine(language, generation);
    } finally {
      trace.end();
    }
  }

  async #openEngine(language: Language, generation: number): Promise<void> {
    this.#switchTo(language);
    this.opening = true;
    this.engineFailure = null;
    this.#recognizerLanguage = language;

    try {
      const opened = await this.#container.recognition.prepareRecognizer(language, {
        onProgress: (load) => {
          if (this.#serves(generation, language)) this.progress = load;
        },
        onSession: (session) => {
          if (this.#serves(generation, language)) this.session = session;
        },
      });

      if (!this.#serves(generation, language)) return;

      if (opened.ok) {
        this.session = opened.value;
        this.downloaded = true;
        this.partlyDownloaded = false;
      } else if (opened.error.kind === 'unavailable') {
        this.engineFailure = opened.error.cause;
      }
    } catch (cause) {
      if (this.#serves(generation, language)) this.engineFailure = describeCause(cause);
    } finally {
      if (this.#serves(generation, language)) {
        this.opening = false;
        if (this.#activeRecognitions === 0) this.progress = null;
      }
    }
  }

  #stillWarming(generation: number, language: Language): boolean {
    return generation === this.#generation() && this.#warmed?.language === language;
  }

  #serves(generation: number, language: Language): boolean {
    return generation === this.#generation() && this.#recognizerLanguage === language;
  }

  #switchTo(language: Language): void {
    this.#retiring.delete(language);
    const previous = this.#recognizerLanguage;
    if (previous === null || previous === language) return;

    this.#recognizerLanguage = null;
    this.session = null;
    this.progress = null;
    this.downloaded = false;
    this.partlyDownloaded = false;
    this.opening = false;
    this.engineFailure = null;

    if (this.#activeRecognitions > 0) {
      this.#retiring.add(previous);
      return;
    }
    void this.#container.recognition.closeRecognizer(previous);
  }

  #closeRetired(): void {
    for (const language of this.#retiring) {
      void this.#container.recognition.closeRecognizer(language);
    }
    this.#retiring.clear();
  }

  async #chosenModel(language: Language): Promise<ModelFootprint | null> {
    const choice = await this.#container.recognition
      .readRecognizerSetup(language)
      .catch(() => null);

    return choice !== null && choice.ok ? choice.value.model : null;
  }

  async admits(held: PendingRecognition): Promise<boolean> {
    const trace = this.#container.beginTrace('capture-gate');
    const admitted = await this.#admits(trace, held);
    trace.end();
    return admitted;
  }

  async #admits(trace: Trace, held: PendingRecognition): Promise<boolean> {
    const language = held.language;
    if (held.regions.length === 0) {
      trace.step('stopped', { guard: 'no-regions' });
      return false;
    }

    if (this.#agreed.has(language)) {
      trace.step('reading', { gate: 'agreed-this-session', language });
      return true;
    }

    const footprint = await this.#chosenModel(language);
    if (footprint === null) {
      trace.step('reading', { gate: 'nothing-to-download', language });
      return true;
    }

    const decision = await this.#container.recognition.readModelConsent(language);
    if (decision.ok && decision.value === 'granted') {
      this.#agreed.add(language);
      trace.step('reading', { gate: 'consent-stored', language });
      return true;
    }

    if (this.#declined.has(language)) {
      trace.step('stopped', { guard: 'declined-this-session', language });
      this.#tellDeclined(held, footprint);
      return false;
    }

    this.#pendingRecognition = held;
    this.consentRequest = { language, footprint };
    trace.step('asking', { gate: 'consent-dialog', language, downloadMb: downloadMb(footprint) });
    return false;
  }

  #tellDeclined(held: PendingRecognition, footprint: ModelFootprint): void {
    if (this.#toldDeclined.has(held.language)) return;
    this.#toldDeclined.add(held.language);

    const generation = this.#generation();
    this.#notify({
      tone: 'info',
      title: RECOGNITION_OFF,
      message: RECOGNITION_OFF_REASON,
      action: { label: TURN_ON, run: () => this.#askAgain(held, footprint, generation) },
      duration: ACTION_NOTICE_MS,
    });
  }

  #askAgain(held: PendingRecognition, footprint: ModelFootprint, generation: number): void {
    if (generation !== this.#generation() || this.consentRequest !== null) return;

    this.#pendingRecognition = held;
    this.consentRequest = { language: held.language, footprint };
  }

  async agree(): Promise<PendingRecognition | null> {
    const held = this.#takePending();
    if (held === null) return null;

    this.#agreed.add(held.language);
    await this.#container.recognition.grantModelConsent(held.language);
    return held;
  }

  decline(): void {
    const held = this.#takePending();
    if (held === null) return;

    this.#declined.add(held.language);
    this.#toldDeclined.delete(held.language);
  }

  #takePending(): PendingRecognition | null {
    const held = this.#pendingRecognition;
    this.#pendingRecognition = null;
    this.consentRequest = null;
    return held;
  }

  async read(held: PendingRecognition): Promise<Result<RecognizedText, RecognizeRegionError>> {
    this.#switchTo(held.language);
    this.#recognizerLanguage = held.language;
    this.#activeRecognitions += 1;

    try {
      return await this.#container.recognition.recognizeRegion(
        held.language,
        held.source,
        held.regions,
        held.arrangement,
        {
          onProgress: (load) => {
            if (this.#recognizerLanguage === held.language) this.progress = load;
          },
          onSession: (opened) => {
            if (this.#recognizerLanguage === held.language) this.session = opened;
          },
        },
      );
    } finally {
      this.#activeRecognitions -= 1;
      if (this.#activeRecognitions === 0) {
        this.progress = null;
        this.#closeRetired();
      }
    }
  }

  forget(): void {
    this.#pendingRecognition = null;
    this.#recognizerLanguage = null;
    this.session = null;
    this.progress = null;
    this.downloaded = false;
    this.partlyDownloaded = false;
    this.opening = false;
    this.engineFailure = null;
    this.consentRequest = null;
  }

  close(): void {
    const opened = this.#recognizerLanguage;
    this.forget();
    if (opened === null) return;

    void this.#container.recognition.closeRecognizer(opened);
  }
}

export {
  READING_SELECTION,
  RECOGNITION_OFF,
  TURN_ON,
  modelLoadNote,
  modelLoadAnnouncement,
  RecognizerView,
};
export type { ConsentRequest, PendingRecognition };
