import { decodeAnyImage } from '$lib/platform/image/decode';
import { renderThumbnail } from '$lib/platform/image/thumbnail';
import { readEpubCover } from '../domain/ingest/epub-cover';

type CoverEntry = {
  readonly bytes: number;
  readonly read: (mediaType: string) => Promise<Blob>;
};

type CoverEntryNamed = (path: string) => CoverEntry | null;

const COVER_MAX_WIDTH = 400;

const COVER_MAX_BYTES = 16 * 1024 * 1024;

async function thumbnailOf(entry: CoverEntry, mediaType: string): Promise<Blob> {
  const bitmap = await decodeAnyImage(await entry.read(mediaType));
  try {
    const thumbnail = await renderThumbnail(bitmap, COVER_MAX_WIDTH);
    return thumbnail;
  } finally {
    bitmap.close();
  }
}

async function epubCoverImage(
  packageXml: string,
  packagePath: string,
  entryNamed: CoverEntryNamed,
): Promise<Blob | null> {
  const cover = readEpubCover(packageXml, packagePath);
  if (cover === null) return null;

  const entry = entryNamed(cover.path);
  if (entry === null) return null;
  if (entry.bytes > COVER_MAX_BYTES) return null;

  try {
    const thumbnail = await thumbnailOf(entry, cover.mediaType);
    return thumbnail;
  } catch {
    return null;
  }
}

export { COVER_MAX_BYTES, COVER_MAX_WIDTH, epubCoverImage };
export type { CoverEntry, CoverEntryNamed };
