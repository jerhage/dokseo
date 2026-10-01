import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { isPageImage } from '../domain/ingest/image-entries';
import { entryName } from './file-entry';
import type { PageSourceError } from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';

type PackReport = (packed: number, total: number) => void;

type PackedArchive = { readonly kind: 'success'; readonly archive: Blob } | PageSourceError;

async function packImagesIntoArchive(
  files: readonly File[],
  report: PackReport = () => undefined,
): Promise<PackedArchive> {
  const images = files.filter((file) => isPageImage(entryName(file)));
  if (images.length === 0) {
    return { kind: 'source-unreadable', cause: 'No image files were found' };
  }

  const writer = new ZipWriter(new BlobWriter('application/zip'));
  try {
    report(0, images.length);
    for (const [position, file] of images.entries()) {
      await writer.add(entryName(file), new BlobReader(file), { level: 0 });
      report(position + 1, images.length);
    }
    const archive = await writer.close();
    return { kind: 'success', archive };
  } catch (cause) {
    await writer.close().catch(() => undefined);
    return { kind: 'source-unreadable', cause: describeCause(cause) };
  }
}

export { packImagesIntoArchive };
export type { PackedArchive, PackReport };
