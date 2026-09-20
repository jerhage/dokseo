import { ok, type Result } from '$lib/shared/result';
import type { ModelStorageReport } from '../domain/model-cache';
import type { PartialReport } from '../domain/model-partial';
import type { ModelStorage, ModelStorageError } from '../domain/model-storage';
import type { PartialDownloads } from '../domain/partial-downloads';

export type ModelStorageSnapshot = {
  readonly report: ModelStorageReport;
  readonly partial: PartialReport | null;
  readonly usage: number | null;
  readonly quota: number | null;
  readonly persisted: boolean;
};

export type ReadModelStorageDeps = {
  readonly storage: ModelStorage;
  readonly partials: PartialDownloads;
  readonly estimate: () => Promise<{ usage: number; quota: number } | null>;
  readonly persisted: () => Promise<boolean>;
};

export async function readModelStorage(
  deps: ReadModelStorageDeps,
  modelId: string,
): Promise<Result<ModelStorageSnapshot, ModelStorageError>> {
  const measured = await deps.storage.measure(modelId);
  if (!measured.ok) return measured;

  const [partial, space, persisted] = await Promise.all([
    deps.partials.measure(modelId),
    deps.estimate(),
    deps.persisted(),
  ]);

  const snapshot: ModelStorageSnapshot = {
    report: measured.value,
    partial: partial.ok ? partial.value : null,
    usage: space?.usage ?? null,
    quota: space?.quota ?? null,
    persisted,
  };

  return ok(snapshot);
}
