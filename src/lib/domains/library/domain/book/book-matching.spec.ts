import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from './book';
import { DEFAULT_BOOK_MATCHING, joinUpload } from './book-matching';
import type { UploadIdentity } from './book-matching';

const PARTIAL = 'd41d8cd98f00b204e9800998ecf8427e';

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
    fileName: 'Blame! 1.cbz',
    ...over,
  };
}

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

  it('reports a new book when nothing matches', () => {
    expect(joinUpload([book('a', 'f'.repeat(32), 'other.cbz')], upload(), 'file-name')).toEqual({
      kind: 'new',
    });
  });
});
