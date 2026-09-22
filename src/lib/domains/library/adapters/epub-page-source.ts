import { BlobReader, BlobWriter, TextWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import { decodeImage } from '$lib/platform/image/decode';
import { describeCause } from '$lib/shared/cause';
import type { ImageIndex } from '$lib/shared/ids';
import type { PagePicture, PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { CONTAINER_ENTRY, packagePathFromContainer } from '../domain/ingest/epub-container';
import { describePageObstacle } from '../domain/ingest/epub-obstacle-text';
import { resolveEpubPages } from '../domain/ingest/epub-pages';
import type { PageDocumentReader, PageImage, PageObstacle } from '../domain/ingest/epub-pages';
import { readEpubSpine } from '../domain/ingest/epub-spine';
import type { EpubSpine } from '../domain/ingest/epub-spine';

type OpenedEpub =
  | { readonly kind: 'paged'; readonly source: PageSource }
  | { readonly kind: 'not-paged'; readonly obstacle: PageObstacle };

function filesByName(entries: readonly Entry[]): ReadonlyMap<string, FileEntry> {
  const files = new Map<string, FileEntry>();
  for (const entry of entries) {
    if (!entry.directory) files.set(entry.filename, entry);
  }
  return files;
}

function fileNamed(files: ReadonlyMap<string, FileEntry>, name: string): FileEntry | null {
  const exact = files.get(name);
  if (exact !== undefined) return exact;
  const wanted = name.toLowerCase();
  for (const [filename, entry] of files) {
    if (filename.toLowerCase() === wanted) return entry;
  }
  return null;
}

async function textOf(entry: FileEntry): Promise<string> {
  return await entry.getData(new TextWriter());
}

function unreadable(cause: string): Result<never, PageSourceError> {
  return err({ kind: 'source-unreadable', cause });
}

async function spineOf(
  files: ReadonlyMap<string, FileEntry>,
): Promise<Result<EpubSpine, PageSourceError>> {
  const container = fileNamed(files, CONTAINER_ENTRY);
  if (container === null) return unreadable('That file is not an EPUB');

  const packagePath = packagePathFromContainer(await textOf(container));
  if (packagePath === null) return unreadable('The EPUB names no package document');

  const packageEntry = fileNamed(files, packagePath);
  if (packageEntry === null) {
    return unreadable(`The EPUB has no package document at ${packagePath}`);
  }

  const spine = readEpubSpine(await textOf(packageEntry), packagePath);
  return ok(spine);
}

function spineDocuments(files: ReadonlyMap<string, FileEntry>): PageDocumentReader {
  return async (path: string): Promise<string | null> => {
    const entry = fileNamed(files, path);
    if (entry === null) return null;
    return await textOf(entry);
  };
}

function imageEntries(
  files: ReadonlyMap<string, FileEntry>,
  images: readonly PageImage[],
): Result<readonly FileEntry[], PageObstacle> {
  const entries: FileEntry[] = [];
  for (const page of images) {
    const entry = fileNamed(files, page.image);
    if (entry === null) {
      return err({ kind: 'image-missing', path: page.page, image: page.image });
    }
    entries.push(entry);
  }
  return ok(entries);
}

function pageSourceOver(reader: ZipReader<Blob>, images: readonly FileEntry[]): PageSource {
  const count = images.length;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    void reader.close().catch(() => undefined);
  };

  const entryAt = (index: ImageIndex): Result<FileEntry, PageSourceError> => {
    if (closed) return err({ kind: 'source-unreadable', cause: 'The EPUB is closed' });
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      return err({ kind: 'out-of-range', index, count });
    }
    const image = images[index];
    if (image === undefined) return err({ kind: 'out-of-range', index, count });
    return ok(image);
  };

  return {
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
  };
}

async function readEpub(reader: ZipReader<Blob>): Promise<Result<OpenedEpub, PageSourceError>> {
  const files = filesByName(await reader.getEntries());

  const spine = await spineOf(files);
  if (!spine.ok) return spine;

  const pages = await resolveEpubPages(spine.value, spineDocuments(files));
  if (pages.kind === 'not-paged') return ok({ kind: 'not-paged', obstacle: pages.obstacle });

  const entries = imageEntries(files, pages.images);
  if (!entries.ok) return ok({ kind: 'not-paged', obstacle: entries.error });

  return ok({ kind: 'paged', source: pageSourceOver(reader, entries.value) });
}

async function openEpubBook(source: Blob): Promise<Result<OpenedEpub, PageSourceError>> {
  const reader = new ZipReader(new BlobReader(source));

  let opened: Result<OpenedEpub, PageSourceError>;
  try {
    opened = await readEpub(reader);
  } catch (cause) {
    await reader.close().catch(() => undefined);
    return err({ kind: 'source-unreadable', cause: describeCause(cause) });
  }

  if (!opened.ok || opened.value.kind === 'not-paged') {
    await reader.close().catch(() => undefined);
  }
  return opened;
}

async function openEpubPageSource(source: Blob): Promise<Result<PageSource, PageSourceError>> {
  const opened = await openEpubBook(source);
  if (!opened.ok) return opened;
  if (opened.value.kind === 'not-paged') {
    return unreadable(describePageObstacle(opened.value.obstacle));
  }
  return ok(opened.value.source);
}

export { openEpubBook, openEpubPageSource };
export type { OpenedEpub };
