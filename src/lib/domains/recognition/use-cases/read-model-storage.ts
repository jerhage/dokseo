import { ok, type Result } from '$lib/shared/result';
import { isStored, type ModelStorageReport } from '../domain/model-cache';
import { isPartlyDownloaded, partialReportOf, type PartialReport } from '../domain/model-partial';
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

async function withoutStalePartials(
  deps: ReadModelStorageDeps,
  modelId: string,
  report: ModelStorageReport,
): Promise<PartialReport | null> {
  const measured = await deps.partials.measure(modelId);
  if (!measured.ok) return null;
  if (!isStored(report) || !isPartlyDownloaded(measured.value)) return measured.value;

  const discarded = await deps.partials.discard(modelId);
  return discarded.ok ? partialReportOf([], modelId) : measured.value;
}

export async function readModelStorage(
  deps: ReadModelStorageDeps,
  modelId: string,
): Promise<Result<ModelStorageSnapshot, ModelStorageError>> {
  const measured = await deps.storage.measure(modelId);
  if (!measured.ok) return measured;

  const partial = await withoutStalePartials(deps, modelId, measured.value);
  const [space, persisted] = await Promise.all([deps.estimate(), deps.persisted()]);

  const snapshot: ModelStorageSnapshot = {
    report: measured.value,
    partial,
    usage: space?.usage ?? null,
    quota: space?.quota ?? null,
    persisted,
  };

  return ok(snapshot);
}
