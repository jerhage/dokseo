import { parsedContentHash } from './ids';
import type { BookId, ContentHash } from './ids';
import { bookHref } from './reader-location';

type ShelfEntry = {
  readonly id: BookId;
  readonly contentHash: ContentHash;
};

type UnreadableEntry = {
  readonly id: BookId;
  readonly contentHash: string;
};

type ReaderTarget =
  | { readonly kind: 'shelf'; readonly id: BookId; readonly key: ContentHash }
  | { readonly kind: 'shelf-by-id'; readonly id: BookId; readonly key: ContentHash }
  | { readonly kind: 'unreadable'; readonly id: BookId; readonly key: ContentHash | null }
  | { readonly kind: 'remote'; readonly contentHash: string }
  | { readonly kind: 'awaiting-remote' }
  | { readonly kind: 'not-found' };

const AWAITING_REMOTE: ReaderTarget = { kind: 'awaiting-remote' };

const NOT_FOUND: ReaderTarget = { kind: 'not-found' };

function readerTarget(
  parameter: string,
  shelf: readonly ShelfEntry[],
  unreadable: readonly UnreadableEntry[],
  remote: readonly string[] | null,
): ReaderTarget {
  const keyed = shelf.find((entry) => entry.contentHash === parameter);
  if (keyed !== undefined) return { kind: 'shelf', id: keyed.id, key: keyed.contentHash };

  const identified = shelf.find((entry) => entry.id === parameter);
  if (identified !== undefined) {
    return { kind: 'shelf-by-id', id: identified.id, key: identified.contentHash };
  }

  const broken = unreadable.find(
    (entry) => entry.contentHash === parameter || entry.id === parameter,
  );
  if (broken !== undefined) {
    return { kind: 'unreadable', id: broken.id, key: parsedContentHash(broken.contentHash) };
  }

  if (remote === null) return AWAITING_REMOTE;
  return remote.includes(parameter) ? { kind: 'remote', contentHash: parameter } : NOT_FOUND;
}

function addressWithKey(url: URL, key: ContentHash): URL {
  const keyed = new URL(url);
  keyed.pathname = bookHref(key);
  return keyed;
}

export { addressWithKey, readerTarget };
export type { ReaderTarget, ShelfEntry, UnreadableEntry };
