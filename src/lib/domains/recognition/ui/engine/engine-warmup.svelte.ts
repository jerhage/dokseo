import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import type { ModelLoad } from '../../domain/model/model-load';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { EngineState } from '../../domain/engine/ocr-engine';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { RecognizeRegionResult } from '../../use-cases/engine/recognize-region';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { warmStep } from './engine-gate';
import type { EngineSource, WarmStep } from './engine-gate';

type PendingRecognition = {
  readonly source: PageSource;
  readonly language: Language;
  readonly regions: readonly ImageRegion[];
  readonly arrangement: Arrangement;
};

type EngineWarmth =
  | { readonly kind: 'unchecked' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'partial' }
  | { readonly kind: 'stored' }
  | { readonly kind: 'opening' }
  | { readonly kind: 'failed'; readonly cause: string };

const UNCHECKED: EngineWarmth = { kind: 'unchecked' };

const STORED: EngineWarmth = { kind: 'stored' };

function warmthOf(snapshot: ModelStorageSnapshot | null): EngineWarmth {
  if (snapshot === null) return UNCHECKED;
  if (isStored(snapshot.report)) return STORED;
  if (isPartlyStored(snapshot.report) || isPartlyDownloaded(snapshot.partial)) {
    return { kind: 'partial' };
  }
  return { kind: 'missing' };
}

function engineStateOf(
  warmth: EngineWarmth,
  load: ModelLoad | null,
  session: RecognizerSession | null,
): EngineState {
  const quiet = {
    stored: false,
    opening: false,
    load,
    session,
    failure: null,
    paused: false,
    cancelled: false,
    partlyDownloaded: false,
  };

  return match(warmth)
    .with({ kind: 'unchecked' }, { kind: 'missing' }, () => quiet)
    .with({ kind: 'partial' }, () => ({ ...quiet, partlyDownloaded: true }))
    .with({ kind: 'stored' }, () => ({ ...quiet, stored: true }))
    .with({ kind: 'opening' }, () => ({ ...quiet, stored: true, opening: true }))
    .with({ kind: 'failed' }, (failed) => ({ ...quiet, stored: true, failure: failed.cause }))
    .exhaustive();
}

type WarmedFor = {
  readonly generation: number;
  readonly language: Language;
};

type WarmupJoins = {
  readonly stored: (language: Language) => void;
};

class EngineWarmup {
  warmth = $state.raw<EngineWarmth>(UNCHECKED);
  progress = $state.raw<ModelLoad | null>(null);
  session = $state.raw<RecognizerSession | null>(null);

  #container: Container;
  #engine: EngineSource;
  #generation: () => number;
  #joins: WarmupJoins;
  #warmed: WarmedFor | null = null;
  #waiting: WarmedFor | null = null;
  #activeRecognitions = 0;
  #recognizerLanguage: Language | null = null;
  #retiring = new Set<Language>();

  constructor(
    container: Container,
    engine: EngineSource,
    generation: () => number,
    joins: WarmupJoins,
  ) {
    this.#container = container;
    this.#engine = engine;
    this.#generation = generation;
    this.#joins = joins;
  }

  get engine(): EngineState {
    return engineStateOf(this.warmth, this.progress, this.session);
  }

  async warm(language: Language): Promise<void> {
    const generation = this.#generation();
    const warmed = this.#warmed;
    if (warmed !== null && warmed.generation === generation && warmed.language === language) return;
    this.#warmed = { generation, language };
    this.#waiting = null;
    this.#switchTo(language);

    const trace = this.#container.beginTrace('engine-warm');
    try {
      const opens = this.#opens(trace, { generation, language }, warmStep(this.#engine(language)));
      if (opens) await this.#openEngine(language, generation);
    } finally {
      trace.end();
    }
  }

  async resume(language: Language): Promise<void> {
    const waiting = this.#waiting;
    if (waiting === null || waiting.language !== language) return;
    this.#waiting = null;
    if (waiting.generation === this.#generation()) await this.warm(language);
  }

  #opens(trace: Trace, asked: WarmedFor, step: WarmStep): boolean {
    const language = asked.language;
    return match(step)
      .with({ kind: 'waiting' }, () => {
        this.#warmed = null;
        this.#waiting = asked;
        trace.step('waiting', { gate: 'engine-reads', language });
        return false;
      })
      .with({ kind: 'failed' }, () => {
        trace.step('stopped', { guard: 'engine-reads-failed', language });
        return false;
      })
      .with({ kind: 'no-model' }, () => {
        trace.step('stopped', { guard: 'no-model-for-language', language });
        return false;
      })
      .with({ kind: 'read' }, ({ modelId, snapshot }) => {
        this.warmth = warmthOf(snapshot);
        if (this.warmth.kind !== 'stored') {
          trace.step('stopped', { guard: 'weights-not-on-disk', modelId });
          return false;
        }

        this.#joins.stored(language);
        trace.step('opening', { language, modelId });
        return true;
      })
      .exhaustive();
  }

  async #openEngine(language: Language, generation: number): Promise<void> {
    this.#switchTo(language);
    this.warmth = { kind: 'opening' };
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

      match(opened)
        .with({ kind: 'success' }, ({ session }) => {
          this.session = session;
        })
        .with({ kind: 'unavailable' }, ({ cause }) => {
          this.warmth = { kind: 'failed', cause };
        })
        .with({ kind: 'cancelled' }, () => undefined)
        .exhaustive();
    } catch (cause) {
      if (this.#serves(generation, language)) {
        this.warmth = { kind: 'failed', cause: describeCause(cause) };
      }
    } finally {
      if (this.#serves(generation, language)) {
        if (this.warmth.kind === 'opening') this.warmth = STORED;
        if (this.#activeRecognitions === 0) this.progress = null;
      }
    }
  }

  #serves(generation: number, language: Language): boolean {
    return generation === this.#generation() && this.#recognizerLanguage === language;
  }

  #switchTo(language: Language): void {
    this.#retiring.delete(language);
    const previous = this.#recognizerLanguage;
    if (previous === null || previous === language) return;

    this.forget();

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

  async read(held: PendingRecognition): Promise<RecognizeRegionResult> {
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
    this.#recognizerLanguage = null;
    this.session = null;
    this.progress = null;
    this.warmth = UNCHECKED;
  }

  close(): void {
    const opened = this.#recognizerLanguage;
    this.forget();
    if (opened === null) return;

    void this.#container.recognition.closeRecognizer(opened);
  }
}

export { warmthOf, engineStateOf, EngineWarmup };
export type { PendingRecognition, EngineWarmth, WarmupJoins };
