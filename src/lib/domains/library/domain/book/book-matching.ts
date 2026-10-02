import { match } from 'ts-pattern';
import type { BookId, ContentHash } from '$lib/shared/ids';
import type { Book } from './book';
import { UNTITLED_BOOK } from './removed-book';

type BookMatching = 'content' | 'file-name';

const BOOK_MATCHINGS: readonly BookMatching[] = ['content', 'file-name'];

const DEFAULT_BOOK_MATCHING: BookMatching = 'content';

type UploadIdentity = {
  readonly contentHash: ContentHash;
  readonly fileName: string;
};

type UploadJoin =
  | { readonly kind: 'by-content'; readonly book: Book }
  | { readonly kind: 'by-name'; readonly book: Book }
  | { readonly kind: 'new' };

const NEW_BOOK: UploadJoin = { kind: 'new' };

type RestorableIdentity = {
  readonly id: BookId;
  readonly title: string;
  readonly contentHash: string;
  readonly fileName: string;
  readonly addedAt: number | null;
};

type RestorableUpload = UploadIdentity & { readonly title: string };

type RestorableCandidates<T extends RestorableIdentity> = {
  readonly removed: readonly T[];
  readonly unreadable: readonly T[];
};

type RestoreStep = 'content' | 'file-name' | 'title';

const RESTORE_STEPS: readonly RestoreStep[] = ['content', 'file-name', 'title'];

function matchableTitle(title: string): string | null {
  const normalised = title.normalize('NFC').trim();
  if (normalised.length === 0 || normalised === UNTITLED_BOOK) return null;
  return normalised;
}

function sameTitle(candidate: string, upload: string): boolean {
  const title = matchableTitle(upload);
  return title !== null && matchableTitle(candidate) === title;
}

function matchesAt(step: RestoreStep, candidate: RestorableIdentity, upload: RestorableUpload) {
  return match(step)
    .with('content', () => candidate.contentHash === upload.contentHash)
    .with('file-name', () => upload.fileName.length > 0 && candidate.fileName === upload.fileName)
    .with('title', () => sameTitle(candidate.title, upload.title))
    .exhaustive();
}

function newestFirst<T extends RestorableIdentity>(candidates: readonly T[]): readonly T[] {
  return candidates.toSorted((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

function restorableMatch<T extends RestorableIdentity>(
  candidates: RestorableCandidates<T>,
  upload: RestorableUpload,
): T | null {
  const ranked = [...newestFirst(candidates.unreadable), ...newestFirst(candidates.removed)];
  for (const step of RESTORE_STEPS) {
    const found = ranked.find((candidate) => matchesAt(step, candidate, upload));
    if (found !== undefined) return found;
  }
  return null;
}

function byName(held: readonly Book[], fileName: string): UploadJoin {
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
}

export { BOOK_MATCHINGS, DEFAULT_BOOK_MATCHING, joinUpload, restorableMatch };
export type {
  BookMatching,
  RestorableCandidates,
  RestorableIdentity,
  RestorableUpload,
  UploadIdentity,
  UploadJoin,
};
