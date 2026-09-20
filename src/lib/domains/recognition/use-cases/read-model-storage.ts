import { ok, type Result } from '$lib/shared/result';
import type { ModelStorageReport } from '../domain/model-cache';
import type { ModelStorage, ModelStorageError } from '../domain/model-storage';

export type ModelStorageSnapshot = {
  readonly report: ModelStorageReport;
  readonly usage: number | null;
  readonly quota: number | null;
  readonly persisted: boolean;
};

export type ReadModelStorageDeps = {
  readonly storage: ModelStorage;
  readonly estimate: () => Promise<{ usage: number; quota: number } | null>;
  readonly persisted: () => Promise<boolean>;
};

export async function readModelStorage(
  deps: ReadModelStorageDeps,
  modelId: string,
): Promise<Result<ModelStorageSnapshot, ModelStorageError>> {
  const measured = await deps.storage.measure(modelId);
  if (!measured.ok) return measured;

  const [space, persisted] = await Promise.all([deps.estimate(), deps.persisted()]);
  const snapshot: ModelStorageSnapshot = {
    report: measured.value,
    usage: space?.usage ?? null,
    quota: space?.quota ?? null,
    persisted,
  };

  return ok(snapshot);
}
