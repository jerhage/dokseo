import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from './book';
import { carriesLegacyHash, DEFAULT_BOOK_MATCHING, hashForm, joinUpload } from './book-matching';
import type { UploadIdentity } from './book-matching';

const PARTIAL = 'd41d8cd98f00b204e9800998ecf8427e';

const LEGACY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function book(id: string, hash: string, fileName: string): Book {
  return {
    id: bookId(id),
    title: id,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash(hash),
    fileName,
    imageCount: 3,
    addedAt: 1,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
  };
}

function upload(over: Partial<UploadIdentity> = {}): UploadIdentity {
  return {
    contentHash: contentHash(PARTIAL),
    legacyHash: null,
    fileName: 'Blame! 1.cbz',
    ...over,
  };
}

describe('hashForm', () => {
  it('reads thirty-two hex characters as a partial MD5', () => {
    expect(hashForm(contentHash(PARTIAL))).toBe('partial-md5');
  });

  it('reads sixty-four hex characters as the legacy SHA-256 fingerprint', () => {
    expect(hashForm(contentHash(LEGACY))).toBe('legacy-sha256');
  });

  it('reads the empty hash of a book stored before fingerprints as none', () => {
    expect(hashForm(contentHash(''))).toBe('none');
  });

  it('reads uppercase hex as none, since neither digest writes it', () => {
    expect(hashForm(contentHash(PARTIAL.toUpperCase()))).toBe('none');
  });
});

describe('carriesLegacyHash', () => {
  it('reports only a book holding the legacy form', () => {
    expect(carriesLegacyHash(book('a', LEGACY, ''))).toBe(true);
    expect(carriesLegacyHash(book('b', PARTIAL, ''))).toBe(false);
    expect(carriesLegacyHash(book('c', '', ''))).toBe(false);
  });
});

describe('joinUpload', () => {
  it('matches by content by default', () => {
    expect(DEFAULT_BOOK_MATCHING).toBe('content');
  });

  it('joins the book whose hash is the upload hash', () => {
    const held = [book('other', 'f'.repeat(32), 'Blame! 1.cbz'), book('same', PARTIAL, 'x.cbz')];

    expect(joinUpload(held, upload(), 'content')).toEqual({ kind: 'by-content', book: held[1] });
  });

  it('prefers the content match over a name match when matching by file name', () => {
    const held = [book('named', 'f'.repeat(32), 'Blame! 1.cbz'), book('same', PARTIAL, 'x.cbz')];

    expect(joinUpload(held, upload(), 'file-name')).toEqual({
      kind: 'by-content',
      book: held[1],
    });
  });

  it('joins a book by the name of its file when matching by file name', () => {
    const held = [book('named', 'f'.repeat(32), 'Blame! 1.cbz')];

    expect(joinUpload(held, upload(), 'file-name')).toEqual({ kind: 'by-name', book: held[0] });
  });

  it('ignores a matching name when matching by content', () => {
    const held = [book('named', 'f'.repeat(32), 'Blame! 1.cbz')];

    expect(joinUpload(held, upload(), 'content')).toEqual({ kind: 'new' });
  });

  it('never joins by an empty name', () => {
    const held = [book('unnamed', 'f'.repeat(32), '')];

    expect(joinUpload(held, upload({ fileName: '' }), 'file-name')).toEqual({ kind: 'new' });
  });

  it('joins a book holding the legacy hash of the upload', () => {
    const held = [book('old', LEGACY, '')];

    expect(joinUpload(held, upload({ legacyHash: contentHash(LEGACY) }), 'content')).toEqual({
      kind: 'by-legacy-content',
      book: held[0],
    });
  });

  it('prefers a legacy content match over a name match', () => {
    const held = [book('named', 'f'.repeat(32), 'Blame! 1.cbz'), book('old', LEGACY, '')];

    expect(joinUpload(held, upload({ legacyHash: contentHash(LEGACY) }), 'file-name')).toEqual({
      kind: 'by-legacy-content',
      book: held[1],
    });
  });

  it('matches a legacy hash only against a book in the legacy form', () => {
    const held = [book('empty', '', '')];

    expect(joinUpload(held, upload({ legacyHash: contentHash('') }), 'content')).toEqual({
      kind: 'new',
    });
  });

  it('reports a new book when nothing matches', () => {
    expect(joinUpload([book('a', LEGACY, 'other.cbz')], upload(), 'file-name')).toEqual({
      kind: 'new',
    });
  });
});
