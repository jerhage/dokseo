import { BlobReader, BlobWriter, ZipReader, type Entry, type FileEntry } from '@zip.js/zip.js';
import { decodeImage } from '$lib/platform/image/decode';
import type { ImageIndex } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import { selectImageEntries } from '../domain/image-entries';
import type { PageSource, PageSourceError } from '../domain/page-source';
import { describeCause } from '$lib/shared/cause';

function orderedImages(entries: readonly Entry[]): FileEntry[] {
  const byName = new Map<string, FileEntry>();
  for (const entry of entries) {
    if (!entry.directory) byName.set(entry.filename, entry);
  }
  const ordered: FileEntry[] = [];
  for (const name of selectImageEntries([...byName.keys()])) {
    const entry = byName.get(name);
    if (entry) ordered.push(entry);
  }
  return ordered;
}

export async function openArchivePageSource(
  source: Blob,
): Promise<Result<PageSource, PageSourceError>> {
  const reader = new ZipReader(new BlobReader(source));
  let images: FileEntry[];
  try {
    images = orderedImages(await reader.getEntries());
  } catch (cause) {
    await reader.close().catch(() => undefined);
    return err({ kind: 'source-unreadable', cause: describeCause(cause) });
  }

  const count = images.length;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    void reader.close().catch(() => undefined);
  };

  return ok({
    count,

    async image(index: ImageIndex): Promise<Result<ImageBitmap, PageSourceError>> {
      if (closed) return err({ kind: 'source-unreadable', cause: 'The archive is closed' });
      if (!Number.isInteger(index) || index < 0 || index >= count) {
        return err({ kind: 'out-of-range', index, count });
      }
      const image = images[index];
      if (image === undefined) return err({ kind: 'out-of-range', index, count });
      try {
        const entry = await image.getData(new BlobWriter());
        const bitmap = await decodeImage(entry);
        return ok(bitmap);
      } catch (cause) {
        return err({ kind: 'decode-failed', index, cause: describeCause(cause) });
      }
    },

    close,
    [Symbol.dispose]: close,
  });
}
