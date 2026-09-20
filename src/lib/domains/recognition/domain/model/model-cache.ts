import { knownModel } from './model-footprint';
import { weightsAmong } from './model-weights';

type CacheEntry = {
  readonly url: string;
  readonly bytes: number | null;
};

type ModelStorageReport = {
  readonly modelId: string;
  readonly files: number;
  readonly bytes: number;
  readonly unsized: number;
  readonly required: readonly string[];
  readonly weights: readonly string[];
};

const RUNTIME_SUFFIXES: readonly string[] = ['.wasm', '.mjs'];

function belongsToModel(url: string, modelId: string): boolean {
  return url.includes(`/${modelId}/`);
}

function isRuntimeAsset(url: string): boolean {
  const path = url.split(/[?#]/)[0] ?? '';
  return RUNTIME_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

function entriesOfModel(entries: readonly CacheEntry[], modelId: string): readonly CacheEntry[] {
  return entries.filter((entry) => belongsToModel(entry.url, modelId));
}

function requiredWeights(modelId: string): readonly string[] {
  return knownModel(modelId)?.weightFiles ?? [];
}

function reportOf(entries: readonly CacheEntry[], modelId: string): ModelStorageReport {
  const mine = entriesOfModel(entries, modelId);
  const required = requiredWeights(modelId);
  return {
    modelId,
    files: mine.length,
    bytes: mine.reduce((total, entry) => total + (entry.bytes ?? 0), 0),
    unsized: mine.filter((entry) => entry.bytes === null).length,
    required,
    weights: weightsAmong(
      mine.map((entry) => entry.url),
      required,
    ),
  };
}

function isStored(report: ModelStorageReport): boolean {
  return report.required.length > 0 && report.weights.length === report.required.length;
}

function isPartlyStored(report: ModelStorageReport): boolean {
  return report.files > 0 && !isStored(report);
}

function shareOfUsage(report: ModelStorageReport, usage: number): number {
  if (usage <= 0) return 0;
  return Math.min(1, report.bytes / usage);
}

function restOfUsage(report: ModelStorageReport, usage: number): number {
  return Math.max(0, usage - report.bytes);
}

export {
  belongsToModel,
  isRuntimeAsset,
  entriesOfModel,
  requiredWeights,
  reportOf,
  isStored,
  isPartlyStored,
  shareOfUsage,
  restOfUsage,
};
export type { CacheEntry, ModelStorageReport };
