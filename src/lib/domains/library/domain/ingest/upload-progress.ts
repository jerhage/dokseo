import { match } from 'ts-pattern';
import type { SourceKind } from '../book/book';

type UploadStage =
  | { readonly kind: 'inspecting' }
  | { readonly kind: 'packing'; readonly packed: number; readonly total: number }
  | { readonly kind: 'opening'; readonly sourceKind: SourceKind }
  | { readonly kind: 'covering'; readonly imageCount: number }
  | {
      readonly kind: 'storing';
      readonly imageCount: number;
      readonly writtenBytes: number;
      readonly totalBytes: number;
      readonly elapsedMs: number;
    };

type UploadReport = (stage: UploadStage) => void;

type SourceWriteReport = (writtenBytes: number, totalBytes: number) => void;

type UploadCount = { readonly done: number | null; readonly total: number };

const ESTIMATE_MIN_ELAPSED_MS = 600;

const ESTIMATE_MIN_FRACTION = 0.02;

const INSPECTING: UploadStage = { kind: 'inspecting' };

function uploadCount(stage: UploadStage): UploadCount | null {
  return match(stage)
    .with({ kind: 'inspecting' }, () => null)
    .with({ kind: 'opening' }, () => null)
    .with({ kind: 'packing' }, (packing) => ({ done: packing.packed, total: packing.total }))
    .with({ kind: 'covering' }, (covering) => ({ done: null, total: covering.imageCount }))
    .with({ kind: 'storing' }, (storing) => ({ done: null, total: storing.imageCount }))
    .exhaustive();
}

function fractionOf(done: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(1, Math.max(0, done / total));
}

function uploadFraction(stage: UploadStage): number | null {
  return match(stage)
    .with({ kind: 'inspecting' }, () => null)
    .with({ kind: 'opening' }, () => null)
    .with({ kind: 'covering' }, () => null)
    .with({ kind: 'packing' }, (packing) => fractionOf(packing.packed, packing.total))
    .with({ kind: 'storing' }, (storing) => fractionOf(storing.writtenBytes, storing.totalBytes))
    .exhaustive();
}

function uploadRemainingSeconds(stage: UploadStage): number | null {
  if (stage.kind !== 'storing') return null;

  const { writtenBytes, totalBytes, elapsedMs } = stage;
  if (writtenBytes <= 0 || writtenBytes >= totalBytes) return null;
  if (elapsedMs < ESTIMATE_MIN_ELAPSED_MS) return null;
  if (writtenBytes / totalBytes < ESTIMATE_MIN_FRACTION) return null;

  const remaining = (elapsedMs / writtenBytes) * (totalBytes - writtenBytes);
  return Math.max(1, Math.ceil(remaining / 1000));
}

export { INSPECTING, uploadCount, uploadFraction, uploadRemainingSeconds };
export type { UploadStage, UploadReport, SourceWriteReport, UploadCount };
