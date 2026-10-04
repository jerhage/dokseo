type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};

const PARTIAL_MD5: SourceSnippet = {
  label: 'The partial MD5',
  file: 'src/lib/platform/crypto/partial-md5.ts',
  code: `function luajitLeftShift(value: number, count: number): number {
  return value << count;
}

function partialMd5Offsets(): readonly number[] {
  return Array.from({ length: LAST_EXPONENT - FIRST_EXPONENT + 1 }, (_, position) =>
    luajitLeftShift(PARTIAL_MD5_STEP, 2 * (FIRST_EXPONENT + position)),
  );
}

const PARTIAL_MD5_OFFSETS = partialMd5Offsets();

async function partialMd5(blob: Blob): Promise<string> {
  const md5 = new Md5();
  for (const offset of PARTIAL_MD5_OFFSETS) {
    if (offset >= blob.size) break;
    const sample = await blob.slice(offset, offset + PARTIAL_MD5_SAMPLE_BYTES).arrayBuffer();
    md5.update(new Uint8Array(sample));
  }
  return md5.hexDigest();
}`,
};

const UPLOAD_MANIFEST: SourceSnippet = {
  label: 'The manifest of a folder',
  file: 'src/lib/domains/library/domain/ingest/upload-manifest.ts',
  code: `function lineOf(entry: ManifestEntry): string {
  return JSON.stringify([entry.name, entry.size]);
}

function uploadManifest(entries: readonly ManifestEntry[]): string {
  return entries.map(lineOf).toSorted().join('\\n');
}`,
};

const HASHED_PART: SourceSnippet = {
  label: 'What gets hashed',
  file: 'src/lib/domains/library/use-cases/open-file.ts',
  code: `function hashedPart(files: readonly File[]): Blob {
  const [only] = files;
  if (files.length === 1 && only !== undefined) return only;
  return new Blob([uploadManifest(files)]);
}`,
};

const UPLOAD_NAME: SourceSnippet = {
  label: 'The stored file name',
  file: 'src/lib/domains/library/domain/ingest/upload-name.ts',
  code: `function uploadName(entries: readonly NamedEntry[]): string {
  const [first] = entries;
  if (first === undefined) return NO_UPLOAD_NAME;
  if (entries.length === 1) return first.name.normalize('NFC');
  const [folder = NO_UPLOAD_NAME] = first.webkitRelativePath.split('/');
  const shared = entries.every((entry) => entry.webkitRelativePath.startsWith(\`\${folder}/\`));
  return shared ? folder.normalize('NFC') : NO_UPLOAD_NAME;
}`,
};

const PLAUSIBLE_TITLE: SourceSnippet = {
  label: 'Choosing the title',
  file: 'src/lib/domains/library/domain/book/title.ts',
  code: `function bookTitle(metadataTitle: string | null, fileTitle: string): string {
  const declared = metadataTitle?.trim() ?? '';
  return declared.length > 0 ? declared : fileTitle;
}

const PLACEHOLDER_TITLES: ReadonlySet<string> = new Set(['untitled', 'untitled document']);

const AUTHORING_FILE_NAME = /\\.(?:docx?|pdf|indd|rtf|odt)$/i;

const FILE_PATH = /^(?:[a-z]:[\\\\/]|\\\\\\\\|\\/|~\\/)|\\\\/i;

function plausibleTitle(declared: string): string | null {
  const trimmed = declared.trim();
  if (trimmed.length === 0) return null;
  if (PLACEHOLDER_TITLES.has(trimmed.toLowerCase())) return null;
  if (AUTHORING_FILE_NAME.test(trimmed) || FILE_PATH.test(trimmed)) return null;
  return trimmed;
}`,
};

const SHOWN_TITLE: SourceSnippet = {
  label: 'The alias over the title',
  file: 'src/lib/shared/shown-title.ts',
  code: `function shownTitle(book: Titled): string {
  return book.alias ?? book.title;
}

function aliasFor(title: string, typed: string): string | null {
  const trimmed = typed.trim();
  return trimmed.length === 0 || trimmed === title ? null : trimmed;
}`,
};

const JOIN_UPLOAD: SourceSnippet = {
  label: 'Joining a book on the shelf',
  file: 'src/lib/domains/library/domain/book/book-matching.ts',
  code: `function byName(held: readonly Book[], fileName: string): UploadJoin {
  if (fileName.length === 0) return NEW_BOOK;
  const named = held.find((book) => book.fileName === fileName);
  return named === undefined ? NEW_BOOK : { kind: 'by-name', book: named };
}

function joinUpload(
  held: readonly Book[],
  upload: UploadIdentity,
  matching: BookMatching,
): UploadJoin {
  const same = held.find((book) => book.contentHash === upload.contentHash);
  if (same !== undefined) return { kind: 'by-content', book: same };

  return match(matching)
    .with('content', () => NEW_BOOK)
    .with('file-name', () => byName(held, upload.fileName))
    .exhaustive();
}`,
};

const MATCH_STEPS: SourceSnippet = {
  label: 'The three restore steps',
  file: 'src/lib/domains/library/domain/book/book-matching.ts',
  code: `function matchableTitle(title: string): string | null {
  const normalised = title.normalize('NFC').trim();
  if (normalised.length === 0 || normalised === UNTITLED_BOOK) return null;
  return normalised;
}

function sameTitle(candidate: string, upload: string): boolean {
  const title = matchableTitle(upload);
  return title !== null && matchableTitle(candidate) === title;
}

function matchesAt(step: RestoreStep, candidate: RestorableIdentity, upload: MatchProbe) {
  return match(step)
    .with(
      'content',
      () => upload.contentHash.length > 0 && candidate.contentHash === upload.contentHash,
    )
    .with('file-name', () => upload.fileName.length > 0 && candidate.fileName === upload.fileName)
    .with(
      'title',
      () =>
        sameTitle(candidate.title, upload.title) || sameTitle(candidate.title, upload.fileTitle),
    )
    .exhaustive();
}`,
};

const RESTORABLE_MATCH: SourceSnippet = {
  label: 'Finding a removed or unreadable book',
  file: 'src/lib/domains/library/domain/book/book-matching.ts',
  code: `function restorableMatch<T extends RestorableIdentity>(
  candidates: RestorableCandidates<T>,
  upload: MatchProbe,
): T | null {
  const ranked = [...newestFirst(candidates.unreadable), ...newestFirst(candidates.removed)];
  for (const step of RESTORE_STEPS) {
    const found = ranked.find((candidate) => matchesAt(step, candidate, upload));
    if (found !== undefined) return found;
  }
  return null;
}

function mergeableRows<T extends RestorableIdentity>(
  unreadable: readonly T[],
  held: MatchProbe,
): readonly T[] {
  return unreadable.filter((row) => RESTORE_STEPS.some((step) => matchesAt(step, row, held)));
}

function shelfMatch(shelf: readonly Book[], row: MatchProbe): Book | null {
  return restorableMatch({ removed: [], unreadable: shelf }, row);
}`,
};

const OPEN_FILE_JOIN: SourceSnippet = {
  label: 'openFile, the join',
  file: 'src/lib/domains/library/use-cases/open-file.ts',
  code: `const joined = joinedBook(joinUpload(held, identity, matching));
if (joined !== null) {
  const merge = await mergeStrays(deps, joined, identity, files);
  return { kind: 'already-held', book: joined, merge };
}`,
};

const OPEN_FILE_RESTORE: SourceSnippet = {
  label: 'openFile, the restore',
  file: 'src/lib/domains/library/use-cases/open-file.ts',
  code: `const restoring = restorableMatch(restorable, { ...identity, title, fileTitle });

const book: Book = {
  id: restoring?.id ?? bookId(deps.newId()),
  title,
  alias: restoring?.alias ?? null,`,
};

const REPOSITORY_REMOVE: SourceSnippet = {
  label: 'Removing a book keeps a record',
  file: 'src/lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
  code: `async remove(id: BookId): Promise<LibraryWrite> {
  if (!recordsAvailable() || !blobs.isAvailable()) return STORAGE_UNAVAILABLE;
  const keys = blobKeys(id);
  const db = await database();
  const row = await getRecord<RetiredRow>(db, BOOK_STORE, id);
  const kept = row === undefined ? null : removedBookFrom(row);
  if (kept !== null) await putRecord(db, REMOVED_BOOK_STORE, kept);
  await deleteRecord(db, BOOK_STORE, id);
  await deleteRecord(db, PAGE_LIST_STORE, id);`,
};

const BOOKS_FROM_STORED: SourceSnippet = {
  label: 'One row at a time',
  file: 'src/lib/domains/library/domain/book/stored-book.ts',
  code: `function booksFromStored(rows: readonly StoredBook[]): StoredBooks {
  const books: Book[] = [];
  const unreadable: UnreadableBook[] = [];
  for (const row of rows) {
    try {
      books.push(bookFromStored(row));
    } catch (cause) {
      unreadable.push(unreadableBook(row, cause));
    }
  }
  return { books, unreadable };
}`,
};

const MERGE_STRAY: SourceSnippet = {
  label: 'Merging one unreadable row',
  file: 'src/lib/domains/storage/use-cases/merge-into-book.ts',
  code: `async function mergeStray(
  deps: MergeIntoBookDeps,
  into: BookId,
  stray: BookId,
): Promise<StrayMerge> {
  const moved = await moveCaptures(deps.moving, stray, into);
  if (moved.kind !== 'success') return moved;
  const removed = await removeBook(deps.removing, stray);
  if (removed.kind !== 'success') return { kind: 'captures-moved' };
  const forgotten = await forgetRemovedBook(deps.forgetting, stray);
  if (forgotten.kind !== 'success') return { kind: 'captures-moved' };

  return { kind: 'merged' };
}`,
};

const MATCHING_OPTIONS: SourceSnippet = {
  label: 'The two options',
  file: 'src/lib/domains/library/ui/book-matching-setting.ts',
  code: `const BOOK_MATCHING_OPTIONS: readonly BookMatchingOption[] = [
  {
    matching: 'content',
    label: 'Content',
    hint: 'A file joins a book only when its sampled bytes are the same. Renaming a file keeps it.',
  },
  {
    matching: 'file-name',
    label: 'File name',
    hint: 'A file whose name matches a book also joins it, even when its bytes differ.',
  },
];`,
};

const IDENTITY_SNIPPETS: readonly SourceSnippet[] = [
  PARTIAL_MD5,
  UPLOAD_MANIFEST,
  HASHED_PART,
  UPLOAD_NAME,
  PLAUSIBLE_TITLE,
  SHOWN_TITLE,
  JOIN_UPLOAD,
  MATCH_STEPS,
  RESTORABLE_MATCH,
  OPEN_FILE_JOIN,
  OPEN_FILE_RESTORE,
  REPOSITORY_REMOVE,
  BOOKS_FROM_STORED,
  MERGE_STRAY,
  MATCHING_OPTIONS,
];

export {
  BOOKS_FROM_STORED,
  HASHED_PART,
  IDENTITY_SNIPPETS,
  JOIN_UPLOAD,
  MATCHING_OPTIONS,
  MATCH_STEPS,
  MERGE_STRAY,
  OPEN_FILE_JOIN,
  OPEN_FILE_RESTORE,
  PARTIAL_MD5,
  PLAUSIBLE_TITLE,
  REPOSITORY_REMOVE,
  RESTORABLE_MATCH,
  SHOWN_TITLE,
  UPLOAD_MANIFEST,
  UPLOAD_NAME,
};
export type { SourceSnippet };
