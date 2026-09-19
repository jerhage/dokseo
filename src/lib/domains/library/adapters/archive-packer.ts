import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { err, ok, type Result } from '$lib/shared/result';
import { isImageEntry } from '../domain/image-entries';
import { entryName } from './file-entry';
import type { PageSourceError } from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';

export async function packImagesIntoArchive(
  files: readonly File[],
): Promise<Result<Blob, PageSourceError>> {
  const images = files.filter((file) => isImageEntry(entryName(file)));
  if (images.length === 0) {
    return err({ kind: 'source-unreadable', cause: 'No image files were found' });
  }

  const writer = new ZipWriter(new BlobWriter('application/zip'));
  try {
    for (const file of images) {
      await writer.add(entryName(file), new BlobReader(file), { level: 0 });
    }
    const archive = await writer.close();
    return ok(archive);
  } catch (cause) {
    await writer.close().catch(() => undefined);
    return err({ kind: 'source-unreadable', cause: describeCause(cause) });
  }
}
