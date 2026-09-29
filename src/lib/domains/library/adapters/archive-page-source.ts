import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import { decodeImage } from '$lib/platform/image/decode';
import type { ImageIndex } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { selectImageEntries } from '../domain/ingest/image-entries';
import type { PagePicture, PageSource, PageSourceError } from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';
import { entryImageSizes } from './entry-image-size';

function filesByName(entries: readonly Entry[]): Map<string, FileEntry> {
  const byName = new Map<string, FileEntry>();
  for (const entry of entries) {
    if (!entry.directory) byName.set(entry.filename, entry);
  }
  return byName;
}

function listedImages(
  byName: ReadonlyMap<string, FileEntry>,
  names: readonly string[],
): Result<FileEntry[], PageSourceError> {
  const listed: FileEntry[] = [];
  for (const name of names) {
    const entry = byName.get(name);
    if (entry === undefined) {
      return err({ kind: 'source-unreadable', cause: `The archive holds no page named "${name}"` });
    }
    listed.push(entry);
  }
  return ok(listed);
}

async function listArchivePageNames(
  source: Blob,
): Promise<Result<readonly string[], PageSourceError>> {
  const reader = new ZipReader(new BlobReader(source));
  try {
    const byName = filesByName(await reader.getEntries());
    return ok(selectImageEntries([...byName.keys()]));
  } catch (cause) {
    return err({ kind: 'source-unreadable', cause: describeCause(cause) });
  } finally {
    await reader.close().catch(() => undefined);
  }
}

async function openArchivePageSource(
  source: Blob,
  names: readonly string[],
): Promise<Result<PageSource, PageSourceError>> {
  const reader = new ZipReader(new BlobReader(source));
  let byName: Map<string, FileEntry>;
  try {
    byName = filesByName(await reader.getEntries());
  } catch (cause) {
    await reader.close().catch(() => undefined);
    return err({ kind: 'source-unreadable', cause: describeCause(cause) });
  }
  const listed = listedImages(byName, names);
  if (!listed.ok) {
    await reader.close().catch(() => undefined);
    return listed;
  }
  const images = listed.value;

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

    sizes: () => entryImageSizes(source, images, () => closed, 'The archive is closed'),

    close,
    [Symbol.dispose]: close,
  });
}

export { listArchivePageNames, openArchivePageSource };
