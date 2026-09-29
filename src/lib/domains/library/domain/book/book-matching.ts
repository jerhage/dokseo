import { match } from 'ts-pattern';
import type { ContentHash } from '$lib/shared/ids';
import type { Book } from './book';

type BookMatching = 'content' | 'file-name';

const BOOK_MATCHINGS: readonly BookMatching[] = ['content', 'file-name'];

const DEFAULT_BOOK_MATCHING: BookMatching = 'content';

type HashForm = 'partial-md5' | 'legacy-sha256' | 'none';

const PARTIAL_MD5_FORM = /^[0-9a-f]{32}$/u;

const LEGACY_SHA256_FORM = /^[0-9a-f]{64}$/u;

function hashForm(hash: ContentHash): HashForm {
  if (PARTIAL_MD5_FORM.test(hash)) return 'partial-md5';
  if (LEGACY_SHA256_FORM.test(hash)) return 'legacy-sha256';
  return 'none';
}

function carriesLegacyHash(book: Book): boolean {
  return match(hashForm(book.contentHash))
    .with('legacy-sha256', () => true)
    .with('partial-md5', 'none', () => false)
    .exhaustive();
}

type UploadIdentity = {
  readonly contentHash: ContentHash;
  readonly legacyHash: ContentHash | null;
  readonly fileName: string;
};

type UploadJoin =
  | { readonly kind: 'by-content'; readonly book: Book }
  | { readonly kind: 'by-legacy-content'; readonly book: Book }
  | { readonly kind: 'by-name'; readonly book: Book }
  | { readonly kind: 'new' };

const NEW_BOOK: UploadJoin = { kind: 'new' };

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

  const legacy =
    upload.legacyHash === null
      ? undefined
      : held.find((book) => carriesLegacyHash(book) && book.contentHash === upload.legacyHash);
  if (legacy !== undefined) return { kind: 'by-legacy-content', book: legacy };

  return match(matching)
    .with('content', () => NEW_BOOK)
    .with('file-name', () => byName(held, upload.fileName))
    .exhaustive();
}

export { BOOK_MATCHINGS, DEFAULT_BOOK_MATCHING, carriesLegacyHash, hashForm, joinUpload };
export type { BookMatching, HashForm, UploadIdentity, UploadJoin };
