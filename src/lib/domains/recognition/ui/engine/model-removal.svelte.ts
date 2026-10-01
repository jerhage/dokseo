import type { QueryClient } from '@tanstack/svelte-query';
import { megabytes } from '$lib/shared/bytes';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import { unexpectedMessage } from '$lib/shared/unexpected-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { CACHE_UNREADABLE, deleteModelMutation } from '../../queries/engine-queries';
import type { EngineWrites, ModelTarget } from '../../queries/engine-queries';
import { recognitionKeys } from '../../queries/recognition-keys';
import type { DeleteModelResult } from '../../use-cases/model/delete-model';
import type { OperationClock } from './operation-clock';

const REMOVAL_WARNING = 'The next selection you read downloads it again. Nothing else is deleted.';

const REMOVE_FAILED = 'Could not delete the model';

type RemovalJoins = {
  readonly settled: () => void;
};

class ModelRemoval {
  removing = $state(false);
  confirming = $state(false);
  message = $state.raw<string | null>(null);

  #notify: Notify;
  #clock: OperationClock;
  #joins: RemovalJoins;
  #deleting: WriteQuery<DeleteModelResult, ModelTarget>;

  constructor(
    recognition: Pick<EngineWrites, 'cancelModelLoad' | 'deleteModel'>,
    notify: Notify,
    clock: OperationClock,
    joins: RemovalJoins,
    client: QueryClient,
  ) {
    this.#notify = notify;
    this.#clock = clock;
    this.#joins = joins;
    this.#deleting = writeQuery(() => ({
      ...deleteModelMutation(recognition),
      onSettled: (_removed, _cause, { modelId }) =>
        client.invalidateQueries({ queryKey: recognitionKeys.modelStorage(modelId) }),
    }));
  }

  ask(stored: boolean): void {
    if (!stored) return;
    this.confirming = true;
  }

  dismiss(): void {
    this.confirming = false;
  }

  clearMessage(): void {
    this.message = null;
  }

  forget(): void {
    this.message = null;
    this.confirming = false;
  }

  async remove(language: Language, modelId: string, generation: number): Promise<void> {
    this.removing = true;
    this.message = null;

    try {
      const removed = await this.#deleting.run({ language, modelId });
      if (generation !== this.#clock.current) return;

      this.#joins.settled();
      if (removed.kind === 'success') {
        this.message = `Freed ${megabytes(removed.report.bytes)} MB. ${REMOVAL_WARNING}`;
      } else this.#fail(CACHE_UNREADABLE);
    } catch (cause) {
      if (generation === this.#clock.current) this.#fail(unexpectedMessage(cause));
    } finally {
      if (generation === this.#clock.current) this.removing = false;
    }
  }

  #fail(message: string): void {
    this.#notify({ tone: 'danger', title: REMOVE_FAILED, message });
  }
}

export { REMOVAL_WARNING, REMOVE_FAILED, ModelRemoval };
export type { RemovalJoins };
