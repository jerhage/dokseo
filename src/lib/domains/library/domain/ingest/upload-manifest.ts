type ManifestEntry = {
  readonly name: string;
  readonly size: number;
};

function lineOf(entry: ManifestEntry): string {
  return JSON.stringify([entry.name, entry.size]);
}

function uploadManifest(entries: readonly ManifestEntry[]): string {
  return entries.map(lineOf).toSorted().join('\n');
}

export { uploadManifest };
export type { ManifestEntry };
