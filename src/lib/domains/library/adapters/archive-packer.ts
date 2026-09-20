import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { err, ok, type Result } from '$lib/shared/result';
import { isImageEntry } from '../domain/ingest/image-entries';
import { entryName } from './file-entry';
import type { PageSourceError } from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';

export type PackReport = (packed: number, total: number) => void;

export async function packImagesIntoArchive(
  files: readonly File[],
  report: PackReport = () => undefined,
): Promise<Result<Blob, PageSourceError>> {
  const images = files.filter((file) => isImageEntry(entryName(file)));
  if (images.length === 0) {
    return err({ kind: 'source-unreadable', cause: 'No image files were found' });
  }

  const writer = new ZipWriter(new BlobWriter('application/zip'));
  try {
    report(0, images.length);
    for (const [position, file] of images.entries()) {
      await writer.add(entryName(file), new BlobReader(file), { level: 0 });
      report(position + 1, images.length);
    }
    const archive = await writer.close();
    return ok(archive);
  } catch (cause) {
    await writer.close().catch(() => undefined);
    return err({ kind: 'source-unreadable', cause: describeCause(cause) });
  }
}
