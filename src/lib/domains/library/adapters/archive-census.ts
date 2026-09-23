import { BlobReader, ZipReader } from '@zip.js/zip.js';
import { archiveBreach } from '../domain/ingest/ingest-limits';
import type { IngestLimit } from '../domain/ingest/ingest-limits';

async function archiveLimitBreach(source: Blob): Promise<IngestLimit | null> {
  const reader = new ZipReader(new BlobReader(source));
  try {
    const entries = await reader.getEntries();
    return archiveBreach(entries);
  } catch {
    return null;
  } finally {
    await reader.close().catch(() => undefined);
  }
}

export { archiveLimitBreach };
