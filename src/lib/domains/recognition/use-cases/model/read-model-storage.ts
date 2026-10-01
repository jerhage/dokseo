import { isStored } from '../../domain/model/model-cache';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import { isPartlyDownloaded, partialReportOf } from '../../domain/model/model-partial';
import type { PartialReport } from '../../domain/model/model-partial';
import type { ModelStorage } from '../../domain/model/model-storage';
import type { PartialDownloads } from '../../domain/model/partial-downloads';

type ModelStorageSnapshot = {
  readonly report: ModelStorageReport;
  readonly partial: PartialReport | null;
  readonly usage: number | null;
  readonly quota: number | null;
  readonly persisted: boolean;
};

type ReadModelStorageResult =
  | { readonly kind: 'success'; readonly snapshot: ModelStorageSnapshot }
  | { readonly kind: 'cache-unavailable' };

type ReadModelStorageDeps = {
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
  if (measured.kind !== 'success') return null;
  if (!isStored(report) || !isPartlyDownloaded(measured.report)) return measured.report;

  const discarded = await deps.partials.discard(modelId);
  return discarded.kind === 'success' ? partialReportOf([], modelId) : measured.report;
}

async function readModelStorage(
  deps: ReadModelStorageDeps,
  modelId: string,
): Promise<ReadModelStorageResult> {
  const measured = await deps.storage.measure(modelId);
  if (measured.kind !== 'success') return measured;

  const partial = await withoutStalePartials(deps, modelId, measured.report);
  const [space, persisted] = await Promise.all([deps.estimate(), deps.persisted()]);

  const snapshot: ModelStorageSnapshot = {
    report: measured.report,
    partial,
    usage: space?.usage ?? null,
    quota: space?.quota ?? null,
    persisted,
  };

  return { kind: 'success', snapshot };
}

export { readModelStorage };
export type { ModelStorageSnapshot, ReadModelStorageDeps, ReadModelStorageResult };
