import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import { describeCause } from '$lib/shared/cause';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { CONTAINER_ENTRY, packagePathFromContainer } from '../domain/ingest/epub-container';
import type { EpubInspection, EpubInspectionError } from '../domain/ingest/epub-inspection';
import { readEpubPackage } from '../domain/ingest/epub-package';
import { blocksReading, bookProtection, ENCRYPTION_ENTRY } from '../domain/ingest/epub-protection';

const NOT_AN_EPUB: EpubInspection = { kind: 'not-an-epub' };

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

async function readInspection(
  files: ReadonlyMap<string, FileEntry>,
): Promise<Result<EpubInspection, EpubInspectionError>> {
  const container = fileNamed(files, CONTAINER_ENTRY);
  if (container === null) return ok(NOT_AN_EPUB);

  const encryption = fileNamed(files, ENCRYPTION_ENTRY);
  const protection = bookProtection({
    entryNames: [...files.keys()],
    encryptionXml: encryption === null ? null : await textOf(encryption),
  });
  if (blocksReading(protection)) return err({ kind: 'protected', protection });

  const path = packagePathFromContainer(await textOf(container));
  if (path === null) return err({ kind: 'container-unreadable' });

  const packageEntry = fileNamed(files, path);
  if (packageEntry === null) return err({ kind: 'package-missing', path });

  const packageDocument = readEpubPackage(await textOf(packageEntry));
  if (packageDocument === null) return err({ kind: 'package-unreadable', path });

  return ok({ kind: 'epub', packagePath: path, packageDocument });
}

async function inspectEpubArchive(
  source: Blob,
): Promise<Result<EpubInspection, EpubInspectionError>> {
  const reader = new ZipReader(new BlobReader(source));
  try {
    let entries: readonly Entry[];
    try {
      entries = await reader.getEntries();
    } catch {
      return ok(NOT_AN_EPUB);
    }
    const inspected = await readInspection(filesByName(entries));
    return inspected;
  } catch (cause) {
    return err({ kind: 'archive-unreadable', cause: describeCause(cause) });
  } finally {
    await reader.close().catch(() => undefined);
  }
}

export { inspectEpubArchive };
