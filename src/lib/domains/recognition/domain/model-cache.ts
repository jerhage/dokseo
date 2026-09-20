export type CacheEntry = {
  readonly url: string;
  readonly bytes: number | null;
};

export type ModelStorageReport = {
  readonly modelId: string;
  readonly files: number;
  readonly bytes: number;
  readonly unsized: number;
};

export function belongsToModel(url: string, modelId: string): boolean {
  return url.includes(`/${modelId}/`);
}

export function entriesOfModel(
  entries: readonly CacheEntry[],
  modelId: string,
): readonly CacheEntry[] {
  return entries.filter((entry) => belongsToModel(entry.url, modelId));
}

export function reportOf(entries: readonly CacheEntry[], modelId: string): ModelStorageReport {
  const mine = entriesOfModel(entries, modelId);
  return {
    modelId,
    files: mine.length,
    bytes: mine.reduce((total, entry) => total + (entry.bytes ?? 0), 0),
    unsized: mine.filter((entry) => entry.bytes === null).length,
  };
}

export function isStored(report: ModelStorageReport): boolean {
  return report.files > 0;
}

export function shareOfUsage(report: ModelStorageReport, usage: number): number {
  if (usage <= 0) return 0;
  return Math.min(1, report.bytes / usage);
}

export function restOfUsage(report: ModelStorageReport, usage: number): number {
  return Math.max(0, usage - report.bytes);
}
