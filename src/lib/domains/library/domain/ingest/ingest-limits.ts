import { match } from 'ts-pattern';
import { storedSize } from '$lib/shared/bytes';
import { extensionOf } from './entry-path';

const MAX_UPLOAD_BYTES = 2_000_000_000;

const MAX_ARCHIVE_ENTRIES = 20_000;

const MAX_ENTRY_BYTES = 500_000_000;

const MAX_INFLATED_BYTES = 4_000_000_000;

const MAX_MARKUP_BYTES = 4_000_000;

const BYTES_PER_GB = 1_000_000_000;

const MARKUP_EXTENSIONS: ReadonlySet<string> = new Set([
  'htm',
  'html',
  'ncx',
  'opf',
  'smil',
  'svg',
  'xhtml',
  'xml',
]);

type IngestLimit =
  | { readonly kind: 'upload-too-large'; readonly bytes: number }
  | { readonly kind: 'too-many-entries'; readonly entries: number }
  | { readonly kind: 'entry-too-large'; readonly name: string; readonly bytes: number }
  | { readonly kind: 'inflates-too-far'; readonly bytes: number }
  | { readonly kind: 'markup-too-long'; readonly name: string; readonly bytes: number };

type SizedFile = { readonly size: number };

type SizedEntry = {
  readonly filename: string;
  readonly directory: boolean;
  readonly uncompressedSize: number;
};

function sizeText(bytes: number): string {
  if (bytes < BYTES_PER_GB) return storedSize(bytes);
  return `${Math.round((bytes / BYTES_PER_GB) * 10) / 10} GB`;
}

function isMarkupEntry(name: string): boolean {
  return MARKUP_EXTENSIONS.has(extensionOf(name));
}

function uploadBreach(files: readonly SizedFile[]): IngestLimit | null {
  let bytes = 0;
  for (const file of files) bytes += file.size;
  if (bytes <= MAX_UPLOAD_BYTES) return null;
  return { kind: 'upload-too-large', bytes };
}

function entryBreach(entry: SizedEntry): IngestLimit | null {
  if (isMarkupEntry(entry.filename)) {
    if (entry.uncompressedSize <= MAX_MARKUP_BYTES) return null;
    return { kind: 'markup-too-long', name: entry.filename, bytes: entry.uncompressedSize };
  }
  if (entry.uncompressedSize <= MAX_ENTRY_BYTES) return null;
  return { kind: 'entry-too-large', name: entry.filename, bytes: entry.uncompressedSize };
}

function archiveBreach(entries: readonly SizedEntry[]): IngestLimit | null {
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    return { kind: 'too-many-entries', entries: entries.length };
  }

  let inflated = 0;
  let oversized: IngestLimit | null = null;
  for (const entry of entries) {
    if (entry.directory) continue;
    inflated += entry.uncompressedSize;
    oversized ??= entryBreach(entry);
  }

  if (oversized !== null) return oversized;
  if (inflated > MAX_INFLATED_BYTES) return { kind: 'inflates-too-far', bytes: inflated };
  return null;
}

function markupBreach(name: string, length: number): IngestLimit | null {
  if (length <= MAX_MARKUP_BYTES) return null;
  return { kind: 'markup-too-long', name, bytes: length };
}

function describeIngestLimit(limit: IngestLimit): string {
  return match(limit)
    .with(
      { kind: 'upload-too-large' },
      (over) =>
        `That upload is ${sizeText(over.bytes)}, over the ${sizeText(MAX_UPLOAD_BYTES)} one upload may be.`,
    )
    .with(
      { kind: 'too-many-entries' },
      (many) =>
        `That archive holds ${many.entries} entries, over the ${MAX_ARCHIVE_ENTRIES} an archive may hold.`,
    )
    .with(
      { kind: 'entry-too-large' },
      (big) =>
        `${big.name} unpacks to ${sizeText(big.bytes)}, over the ${sizeText(MAX_ENTRY_BYTES)} one entry may unpack to.`,
    )
    .with(
      { kind: 'inflates-too-far' },
      (far) =>
        `That archive unpacks to ${sizeText(far.bytes)}, over the ${sizeText(MAX_INFLATED_BYTES)} an archive may unpack to.`,
    )
    .with(
      { kind: 'markup-too-long' },
      (long) =>
        `${long.name} holds ${sizeText(long.bytes)} of markup, over the ${sizeText(MAX_MARKUP_BYTES)} one document may hold.`,
    )
    .exhaustive();
}

export {
  archiveBreach,
  describeIngestLimit,
  entryBreach,
  isMarkupEntry,
  markupBreach,
  MAX_ARCHIVE_ENTRIES,
  MAX_ENTRY_BYTES,
  MAX_INFLATED_BYTES,
  MAX_MARKUP_BYTES,
  MAX_UPLOAD_BYTES,
  uploadBreach,
};
export type { IngestLimit, SizedEntry, SizedFile };
