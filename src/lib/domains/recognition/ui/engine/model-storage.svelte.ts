import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { describeCause } from '$lib/shared/cause';
import type { Result } from '$lib/shared/result';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { PartialReport } from '../../domain/model/model-partial';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { ModelStorageError } from '../../domain/model/model-storage';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import type { OperationClock } from './operation-clock';

function storageFailureNote(error: ModelStorageError): string {
  return match(error)
    .with(
      { kind: 'cache-unavailable' },
      () => 'This browser exposes no cache, so what the model occupies cannot be read.',
    )
    .with({ kind: 'cache-failed' }, (failed) => `The cache could not be read: ${failed.cause}`)
    .exhaustive();
}

class ModelStorage {
  snapshot = $state.raw<ModelStorageSnapshot | null>(null);
  message = $state.raw<string | null>(null);

  #container: Container;
  #clock: OperationClock;

  constructor(container: Container, clock: OperationClock) {
    this.#container = container;
    this.#clock = clock;
  }

  get stored(): boolean {
    const report = this.snapshot?.report;
    return report !== undefined && isStored(report);
  }

  get partial(): PartialReport | null {
    return this.snapshot?.partial ?? null;
  }

  get partlyStored(): boolean {
    const report = this.snapshot?.report;
    return report !== undefined && isPartlyStored(report);
  }

  get resumable(): boolean {
    return !this.stored && (this.partlyStored || isPartlyDownloaded(this.partial));
  }

  forget(): void {
    this.snapshot = null;
    this.message = null;
  }

  async measure(model: ModelFootprint | null, generation: number): Promise<void> {
    if (model === null) return;

    let read: Result<ModelStorageSnapshot, ModelStorageError>;
    try {
      read = await this.#container.recognition.readModelStorage(model.modelId);
    } catch (cause) {
      if (generation !== this.#clock.current) return;
      this.snapshot = null;
      this.message = `What the model occupies could not be read: ${describeCause(cause)}`;
      return;
    }

    if (generation !== this.#clock.current) return;

    if (read.ok) {
      this.snapshot = read.value;
      this.message = null;
    } else {
      this.snapshot = null;
      this.message = storageFailureNote(read.error);
    }
  }
}

export { ModelStorage, storageFailureNote };
