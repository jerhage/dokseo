import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import { decodeImage } from '$lib/platform/image/decode';
import type { ImageIndex } from '$lib/shared/ids';
import { selectImageEntries } from '../domain/ingest/image-entries';
import type {
  ImageRead,
  PageNamesRead,
  PageSourceError,
  PageSourceOpening,
  PictureRead,
} from '$lib/shared/page-source';
import { describeCause } from '$lib/shared/cause';
import { entryImageSizes } from './entry-image-size';

type ListedImages = { readonly kind: 'success'; readonly images: FileEntry[] } | PageSourceError;

type FoundEntry = { readonly kind: 'success'; readonly entry: FileEntry } | PageSourceError;

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
): ListedImages {
  const listed: FileEntry[] = [];
  for (const name of names) {
    const entry = byName.get(name);
    if (entry === undefined) {
      return { kind: 'source-unreadable', cause: `The archive holds no page named "${name}"` };
    }
    listed.push(entry);
  }
  return { kind: 'success', images: listed };
}

async function listArchivePageNames(source: Blob): Promise<PageNamesRead> {
  const reader = new ZipReader(new BlobReader(source));
  try {
    const byName = filesByName(await reader.getEntries());
    return { kind: 'success', names: selectImageEntries([...byName.keys()]) };
  } catch (cause) {
    return { kind: 'source-unreadable', cause: describeCause(cause) };
  } finally {
    await reader.close().catch(() => undefined);
  }
}

async function openArchivePageSource(
  source: Blob,
  names: readonly string[],
): Promise<PageSourceOpening> {
  const reader = new ZipReader(new BlobReader(source));
  let byName: Map<string, FileEntry>;
  try {
    byName = filesByName(await reader.getEntries());
  } catch (cause) {
    await reader.close().catch(() => undefined);
    return { kind: 'source-unreadable', cause: describeCause(cause) };
  }
  const listed = listedImages(byName, names);
  if (listed.kind !== 'success') {
    await reader.close().catch(() => undefined);
    return listed;
  }
  const images = listed.images;

  const count = images.length;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    void reader.close().catch(() => undefined);
  };

  const entryAt = (index: ImageIndex): FoundEntry => {
    if (closed) return { kind: 'source-unreadable', cause: 'The archive is closed' };
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      return { kind: 'out-of-range', index, count };
    }
    const image = images[index];
    if (image === undefined) return { kind: 'out-of-range', index, count };
    return { kind: 'success', entry: image };
  };

  return {
    kind: 'success',
    pages: {
      count,

      async picture(index: ImageIndex): Promise<PictureRead> {
        const found = entryAt(index);
        if (found.kind !== 'success') return found;
        try {
          const entry = await found.entry.getData(new BlobWriter());
          const url = URL.createObjectURL(entry);
          return { kind: 'success', picture: { kind: 'encoded', url } };
        } catch (cause) {
          return { kind: 'page-unreadable', index, cause: describeCause(cause) };
        }
      },

      async image(index: ImageIndex): Promise<ImageRead> {
        const found = entryAt(index);
        if (found.kind !== 'success') return found;

        let entry: Blob;
        try {
          entry = await found.entry.getData(new BlobWriter());
        } catch (cause) {
          return { kind: 'page-unreadable', index, cause: describeCause(cause) };
        }

        try {
          const bitmap = await decodeImage(entry);
          return { kind: 'success', image: bitmap };
        } catch (cause) {
          return { kind: 'decode-failed', index, cause: describeCause(cause) };
        }
      },

      sizes: () => entryImageSizes(source, images, () => closed, 'The archive is closed'),

      close,
      [Symbol.dispose]: close,
    },
  };
}

export { listArchivePageNames, openArchivePageSource };
