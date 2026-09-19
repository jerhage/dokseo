export type ReadStorageUsageDeps = {
  readonly estimate: () => Promise<{ usage: number; quota: number } | null>;
};

export function readStorageUsage(
  deps: ReadStorageUsageDeps,
): Promise<{ usage: number; quota: number } | null> {
  return deps.estimate();
}
