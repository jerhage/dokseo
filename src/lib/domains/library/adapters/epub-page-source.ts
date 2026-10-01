import { match } from 'ts-pattern';
import { BlobReader, BlobWriter, TextWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import { decodeImage } from '$lib/platform/image/decode';
import { describeCause } from '$lib/shared/cause';
import type { ImageIndex } from '$lib/shared/ids';
import type {
  ImageRead,
  PageSource,
  PageSourceError,
  PageSourceOpening,
  PictureRead,
} from '$lib/shared/page-source';
import { CONTAINER_ENTRY, packagePathFromContainer } from '../domain/ingest/epub-container';
import { describePageObstacle } from '../domain/ingest/epub-obstacle-text';
import { resolveEpubPages } from '../domain/ingest/epub-pages';
import type { PageDocumentReader, PageImage, PageObstacle } from '../domain/ingest/epub-pages';
import { readEpubSpine } from '../domain/ingest/epub-spine';
import { epubCoverImage } from './epub-cover-image';
import type { CoverEntry } from './epub-cover-image';
import { entryImageSizes } from './entry-image-size';

type OpenedEpub =
  | { readonly kind: 'paged'; readonly source: PageSource }
  | {
      readonly kind: 'not-paged';
      readonly obstacle: PageObstacle;
      readonly cover: Blob | null;
    };

type EpubOpening = OpenedEpub | PageSourceError;

type PackageDocument = { readonly path: string; readonly xml: string };

type PackageRead =
  | { readonly kind: 'success'; readonly document: PackageDocument }
  | PageSourceError;

type ImageEntries =
  | { readonly kind: 'success'; readonly entries: readonly FileEntry[] }
  | { readonly kind: 'obstacle'; readonly obstacle: PageObstacle };

type FoundEntry = { readonly kind: 'success'; readonly entry: FileEntry } | PageSourceError;

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

function unreadable(cause: string): PageSourceError {
  return { kind: 'source-unreadable', cause };
}

async function packageOf(files: ReadonlyMap<string, FileEntry>): Promise<PackageRead> {
  const container = fileNamed(files, CONTAINER_ENTRY);
  if (container === null) return unreadable('That file is not an EPUB');

  const path = packagePathFromContainer(await textOf(container));
  if (path === null) return unreadable('The EPUB names no package document');

  const packageEntry = fileNamed(files, path);
  if (packageEntry === null) {
    return unreadable(`The EPUB has no package document at ${path}`);
  }

  const xml = await textOf(packageEntry);
  return { kind: 'success', document: { path, xml } };
}

function coverEntries(files: ReadonlyMap<string, FileEntry>): (path: string) => CoverEntry | null {
  return (path: string): CoverEntry | null => {
    const entry = fileNamed(files, path);
    if (entry === null) return null;
    return {
      bytes: entry.uncompressedSize,
      read: (mediaType: string) => entry.getData(new BlobWriter(mediaType)),
    };
  };
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
): ImageEntries {
  const entries: FileEntry[] = [];
  for (const page of images) {
    const entry = fileNamed(files, page.image);
    if (entry === null) {
      return {
        kind: 'obstacle',
        obstacle: { kind: 'image-missing', path: page.page, image: page.image },
      };
    }
    entries.push(entry);
  }
  return { kind: 'success', entries };
}

function pageSourceOver(
  archive: Blob,
  reader: ZipReader<Blob>,
  images: readonly FileEntry[],
): PageSource {
  const count = images.length;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    void reader.close().catch(() => undefined);
  };

  const entryAt = (index: ImageIndex): FoundEntry => {
    if (closed) return { kind: 'source-unreadable', cause: 'The EPUB is closed' };
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      return { kind: 'out-of-range', index, count };
    }
    const image = images[index];
    if (image === undefined) return { kind: 'out-of-range', index, count };
    return { kind: 'success', entry: image };
  };

  return {
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

    sizes: () => entryImageSizes(archive, images, () => closed, 'The EPUB is closed'),

    close,
    [Symbol.dispose]: close,
  };
}

async function readEpub(archive: Blob, reader: ZipReader<Blob>): Promise<EpubOpening> {
  const files = filesByName(await reader.getEntries());

  const packaged = await packageOf(files);
  if (packaged.kind !== 'success') return packaged;
  const { xml, path } = packaged.document;

  const notPaged = async (obstacle: PageObstacle): Promise<EpubOpening> => {
    const cover = await epubCoverImage(xml, path, coverEntries(files));
    return { kind: 'not-paged', obstacle, cover };
  };

  const spine = readEpubSpine(xml, path);
  const pages = await resolveEpubPages(spine, spineDocuments(files));
  if (pages.kind === 'not-paged') {
    const unpaged = await notPaged(pages.obstacle);
    return unpaged;
  }

  const entries = imageEntries(files, pages.images);
  if (entries.kind === 'obstacle') {
    const unpaged = await notPaged(entries.obstacle);
    return unpaged;
  }

  return { kind: 'paged', source: pageSourceOver(archive, reader, entries.entries) };
}

async function openEpubBook(source: Blob): Promise<EpubOpening> {
  const reader = new ZipReader(new BlobReader(source));

  let opened: EpubOpening;
  try {
    opened = await readEpub(source, reader);
  } catch (cause) {
    await reader.close().catch(() => undefined);
    return { kind: 'source-unreadable', cause: describeCause(cause) };
  }

  if (opened.kind !== 'paged') await reader.close().catch(() => undefined);
  return opened;
}

async function openEpubPageSource(source: Blob): Promise<PageSourceOpening> {
  const opened = await openEpubBook(source);
  return match(opened)
    .returnType<PageSourceOpening>()
    .with({ kind: 'paged' }, ({ source: pages }) => ({ kind: 'success', pages }))
    .with({ kind: 'not-paged' }, ({ obstacle }) => unreadable(describePageObstacle(obstacle)))
    .with(
      { kind: 'out-of-range' },
      { kind: 'page-unreadable' },
      { kind: 'decode-failed' },
      { kind: 'render-failed' },
      { kind: 'source-unreadable' },
      (failure) => failure,
    )
    .exhaustive();
}

export { openEpubBook, openEpubPageSource };
export type { EpubOpening, OpenedEpub };
