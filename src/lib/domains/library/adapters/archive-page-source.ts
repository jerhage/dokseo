import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import { decodeImage } from '$lib/platform/image/decode';
import type { ImageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { selectImageEntries } from '../domain/ingest/image-entries';
import type { PagePicture, PageSource, PageSourceError } from '$lib/shared/page-source';
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

async function openArchivePageSource(source: Blob): Promise<Result<PageSource, PageSourceError>> {
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

  const entryAt = (index: ImageIndex): Result<FileEntry, PageSourceError> => {
    if (closed) return err({ kind: 'source-unreadable', cause: 'The archive is closed' });
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      return err({ kind: 'out-of-range', index, count });
    }
    const image = images[index];
    if (image === undefined) return err({ kind: 'out-of-range', index, count });
    return ok(image);
  };

  return ok({
    count,

    async picture(index: ImageIndex): Promise<Result<PagePicture, PageSourceError>> {
      const found = entryAt(index);
      if (!found.ok) return found;
      try {
        const entry = await found.value.getData(new BlobWriter());
        const url = URL.createObjectURL(entry);
        return ok({ kind: 'encoded', url });
      } catch (cause) {
        return err({ kind: 'page-unreadable', index, cause: describeCause(cause) });
      }
    },

    async image(index: ImageIndex): Promise<Result<ImageBitmap, PageSourceError>> {
      const found = entryAt(index);
      if (!found.ok) return found;

      let entry: Blob;
      try {
        entry = await found.value.getData(new BlobWriter());
      } catch (cause) {
        return err({ kind: 'page-unreadable', index, cause: describeCause(cause) });
      }

      try {
        return ok(await decodeImage(entry));
      } catch (cause) {
        return err({ kind: 'decode-failed', index, cause: describeCause(cause) });
      }
    },

    close,
    [Symbol.dispose]: close,
  });
}

export { openArchivePageSource };
