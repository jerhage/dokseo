import type { QueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import { loadVerb } from '../../domain/model/model-load';
import type { ModelLoad } from '../../domain/model/model-load';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { EngineState } from '../../domain/engine/ocr-engine';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { RecognizeRegionError } from '../../use-cases/engine/recognize-region';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { modelStorageQuery } from '../../queries/engine-queries';
import { readChosenFootprint } from './chosen-footprint';

const READING_SELECTION = 'Reading the selection.';

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
  #client: QueryClient;
  #generation: () => number;
  #joins: WarmupJoins;
  #warmed: WarmedFor | null = null;
  #activeRecognitions = 0;
  #recognizerLanguage: Language | null = null;
  #retiring = new Set<Language>();

  constructor(
    container: Container,
    client: QueryClient,
    generation: () => number,
    joins: WarmupJoins,
  ) {
    this.#container = container;
    this.#client = client;
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
    this.#switchTo(language);

    const trace = this.#container.beginTrace('engine-warm');
    try {
      const recognition = this.#container.recognition;
      const model = await readChosenFootprint(this.#client, recognition, language);
      if (!this.#stillWarming(generation, language)) return;
      if (model === null) {
        trace.step('stopped', { guard: 'no-model-for-language', language });
        return;
      }

      const held = await this.#client
        .fetchQuery(modelStorageQuery(recognition, model.modelId))
        .catch(() => null);
      if (!this.#stillWarming(generation, language)) return;

      this.warmth = warmthOf(held);
      if (this.warmth.kind !== 'stored') {
        trace.step('stopped', { guard: 'weights-not-on-disk', modelId: model.modelId });
        return;
      }

      this.#joins.stored(language);
      trace.step('opening', { language, modelId: model.modelId });
      await this.#openEngine(language, generation);
    } finally {
      trace.end();
    }
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

      if (opened.ok) {
        this.session = opened.value;
      } else if (opened.error.kind === 'unavailable') {
        this.warmth = { kind: 'failed', cause: opened.error.cause };
      }
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

export {
  READING_SELECTION,
  modelLoadNote,
  modelLoadAnnouncement,
  warmthOf,
  engineStateOf,
  EngineWarmup,
};
export type { PendingRecognition, EngineWarmth, WarmupJoins };
