import { match } from 'ts-pattern';
import type { BookId, ContentHash } from '$lib/shared/ids';
import type { Book } from './book';

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
  readonly contentHash: string;
  readonly fileName: string;
};

const PARTIAL_MD5_DIGEST = /^[0-9a-f]{32}$/;

function isPartialMd5Digest(hash: string): boolean {
  return PARTIAL_MD5_DIGEST.test(hash);
}

function joinsByName(
  candidate: RestorableIdentity,
  fileName: string,
  matching: BookMatching,
): boolean {
  if (fileName.length === 0 || candidate.fileName !== fileName) return false;
  return matching === 'file-name' || !isPartialMd5Digest(candidate.contentHash);
}

function restorableMatch<T extends RestorableIdentity>(
  candidates: readonly T[],
  upload: UploadIdentity,
  matching: BookMatching,
): T | null {
  const same = candidates.find((candidate) => candidate.contentHash === upload.contentHash);
  if (same !== undefined) return same;
  return candidates.find((candidate) => joinsByName(candidate, upload.fileName, matching)) ?? null;
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

export { BOOK_MATCHINGS, DEFAULT_BOOK_MATCHING, isPartialMd5Digest, joinUpload, restorableMatch };
export type { BookMatching, RestorableIdentity, UploadIdentity, UploadJoin };
