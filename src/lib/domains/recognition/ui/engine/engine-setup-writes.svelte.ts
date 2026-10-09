import type { QueryClient } from '@tanstack/svelte-query';
import type { Container } from '$lib/container';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { ComputeChoice } from '../../domain/engine/compute-choice';
import { saveSetupMutation } from '../../queries/engine-queries';
import type { LanguageSetup, LanguageSetupRead, SetupChange } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { SaveRecognizerSetupResult } from '../../use-cases/engine/save-recognizer-setup';
import { shownModel } from './engine-setup';
import { ModelDownload } from './model-download.svelte';
import { ModelRemoval } from './model-removal.svelte';
import { OperationClock } from './operation-clock';

const SETUP_FAILED = 'Could not save the engine choice';

const SETUP_UNKEPT = 'This browser blocks local storage, so the choice was not kept.';

class EngineSetup {
  readonly download: ModelDownload;
  readonly removal: ModelRemoval;

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

  languageChosen(): void {
    this.#clock.next();
    this.download.reset();
    this.removal.clearMessage();
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

export { SETUP_FAILED, SETUP_UNKEPT, EngineSetup };
