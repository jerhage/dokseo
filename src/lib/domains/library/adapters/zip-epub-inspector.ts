import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import { describeCause } from '$lib/shared/cause';
import { CONTAINER_ENTRY, packagePathFromContainer } from '../domain/ingest/epub-container';
import type { EpubInspection, EpubInspectionAnswer } from '../domain/ingest/epub-inspection';
import { readEpubPackage } from '../domain/ingest/epub-package';
import { blocksReading, bookProtection, ENCRYPTION_ENTRY } from '../domain/ingest/epub-protection';
import { archiveBreach } from '../domain/ingest/ingest-limits';

const NOT_AN_EPUB: EpubInspectionAnswer = { kind: 'success', inspection: { kind: 'not-an-epub' } };

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
): Promise<EpubInspectionAnswer> {
  const container = fileNamed(files, CONTAINER_ENTRY);
  if (container === null) return NOT_AN_EPUB;

  const encryption = fileNamed(files, ENCRYPTION_ENTRY);
  const protection = bookProtection({
    entryNames: [...files.keys()],
    encryptionXml: encryption === null ? null : await textOf(encryption),
  });
  if (blocksReading(protection)) return { kind: 'protected', protection };

  const path = packagePathFromContainer(await textOf(container));
  if (path === null) return { kind: 'container-unreadable' };

  const packageEntry = fileNamed(files, path);
  if (packageEntry === null) return { kind: 'package-missing', path };

  const packageDocument = readEpubPackage(await textOf(packageEntry));
  if (packageDocument === null) return { kind: 'package-unreadable', path };

  const inspection: EpubInspection = { kind: 'epub', packagePath: path, packageDocument };
  return { kind: 'success', inspection };
}

async function inspectEpubArchive(source: Blob): Promise<EpubInspectionAnswer> {
  const reader = new ZipReader(new BlobReader(source));
  try {
    let entries: readonly Entry[];
    try {
      entries = await reader.getEntries();
    } catch {
      return NOT_AN_EPUB;
    }
    const breach = archiveBreach(entries);
    if (breach !== null) return { kind: 'too-large', limit: breach };

    const inspected = await readInspection(filesByName(entries));
    return inspected;
  } catch (cause) {
    return { kind: 'archive-unreadable', cause: describeCause(cause) };
  } finally {
    await reader.close().catch(() => undefined);
  }
}

export { inspectEpubArchive };
