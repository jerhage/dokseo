import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { describeCause } from '$lib/shared/cause';
import { LANGUAGES } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { Result } from '$lib/shared/result';
import type { ComputeChoice, GpuDetection } from '../../domain/engine/compute-choice';
import type { RecognizerChoice, SetupError } from '../../domain/engine/recognizer-setup';
import { modelsFor } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';

type OfferedModels = readonly [ModelFootprint, ...ModelFootprint[]];

type EngineChoice = {
  readonly language: Language;
  readonly models: OfferedModels;
  readonly selected: string | null;
  readonly compute: ComputeChoice;
  readonly detection: GpuDetection;
};

const NO_MODEL = 'No recognition model reads this language.';

function engineLanguages(): readonly Language[] {
  return LANGUAGES.filter((language) => modelsFor(language).length > 0);
}

function offeredModels(language: Language): OfferedModels | null {
  const [first, ...rest] = modelsFor(language);
  return first === undefined ? null : [first, ...rest];
}

function shownModel(choice: EngineChoice): ModelFootprint {
  return choice.models.find((known) => known.modelId === choice.selected) ?? choice.models[0];
}

function setupReadNote(error: SetupError): string {
  return match(error)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so the engine choice cannot be read.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

class EngineSetup {
  state = $state.raw<ReadState<EngineChoice>>(LOADING);
  language = $state.raw<Language | null>(null);

  #container: Container;
  #generation: () => number;

  constructor(container: Container, generation: () => number) {
    this.#container = container;
    this.#generation = generation;
  }

  get choice(): EngineChoice | null {
    return this.state.kind === 'ready' ? this.state.value : null;
  }

  get model(): ModelFootprint | null {
    const choice = this.choice;
    return choice === null ? null : shownModel(choice);
  }

  async load(generation: number): Promise<void> {
    const language = this.language ?? engineLanguages()[0] ?? null;
    this.language = language;
    this.state = LOADING;
    const models = language === null ? null : offeredModels(language);
    if (language === null || models === null) {
      this.state = readFailed(NO_MODEL);
      return;
    }

    let read: readonly [Result<RecognizerChoice, SetupError>, GpuDetection];
    try {
      read = await Promise.all([
        this.#container.recognition.readRecognizerSetup(language),
        this.#container.recognition.detectCompute(),
      ]);
    } catch (cause) {
      if (generation === this.#generation()) this.state = readFailed(describeCause(cause));
      return;
    }

    if (generation !== this.#generation()) return;

    const [choice, detection] = read;
    if (!choice.ok) {
      this.state = readFailed(setupReadNote(choice.error));
      return;
    }

    this.state = readReady({
      language,
      models,
      selected: choice.value.model?.modelId ?? null,
      compute: choice.value.compute,
      detection,
    });
  }

  select(modelId: string): void {
    const choice = this.choice;
    if (choice !== null) this.state = readReady({ ...choice, selected: modelId });
  }

  setCompute(compute: ComputeChoice): void {
    const choice = this.choice;
    if (choice !== null) this.state = readReady({ ...choice, compute });
  }
}

export { EngineSetup, engineLanguages, offeredModels, setupReadNote, shownModel };
export type { EngineChoice, OfferedModels };
