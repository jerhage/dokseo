import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from './book';
import { DEFAULT_BOOK_MATCHING, joinUpload, restorableMatch } from './book-matching';
import type { RestorableIdentity, RestorableUpload, UploadIdentity } from './book-matching';

const PARTIAL = 'd41d8cd98f00b204e9800998ecf8427e';

function book(id: string, hash: string, fileName: string): Book {
  return {
    id: bookId(id),
    title: id,
    alias: null,
    seriesId: null,
    volume: null,
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

function candidate(over: Partial<RestorableIdentity> = {}): RestorableIdentity {
  return {
    id: bookId('old'),
    title: 'キノの旅 the Beautiful World',
    contentHash: 'a'.repeat(64),
    fileName: '',
    addedAt: null,
    ...over,
  };
}

function restoring(over: Partial<RestorableUpload> = {}): RestorableUpload {
  return {
    contentHash: contentHash(PARTIAL),
    fileName: 'kino.epub',
    title: 'キノの旅 the Beautiful World',
    fileTitle: 'kino',
    ...over,
  };
}

describe('restorableMatch', () => {
  it('matches by the file-name title a row stored before titles came from metadata', () => {
    const old = candidate({ title: 'kino' });

    expect(restorableMatch({ removed: [old], unreadable: [] }, restoring())).toBe(old);
  });

  it('matches by the metadata title a row stored with it', () => {
    const titled = candidate();

    expect(restorableMatch({ removed: [titled], unreadable: [] }, restoring())).toBe(titled);
  });

  it('matches by title an unreadable row with a SHA-256 hash and no file name', () => {
    const old = candidate();

    expect(restorableMatch({ removed: [], unreadable: [old] }, restoring())).toBe(old);
  });

  it('prefers a file name match over a title match', () => {
    const titled = candidate({ id: bookId('titled') });
    const named = candidate({ id: bookId('named'), title: 'Other', fileName: 'kino.epub' });

    expect(restorableMatch({ removed: [titled, named], unreadable: [] }, restoring())).toBe(named);
  });

  it('prefers a content match over a file name match', () => {
    const named = candidate({ id: bookId('named'), fileName: 'kino.epub' });
    const same = candidate({ id: bookId('same'), title: 'Other', contentHash: PARTIAL });

    expect(restorableMatch({ removed: [named, same], unreadable: [] }, restoring())).toBe(same);
  });

  it('matches no empty title and no placeholder title', () => {
    const untitled = candidate({ title: 'Untitled book' });
    const empty = candidate({ title: '' });

    expect(
      restorableMatch(
        { removed: [untitled], unreadable: [] },
        restoring({ title: 'Untitled book', fileTitle: 'Untitled book' }),
      ),
    ).toBeNull();
    expect(
      restorableMatch(
        { removed: [empty], unreadable: [] },
        restoring({ title: '  ', fileTitle: '' }),
      ),
    ).toBeNull();
  });

  it('matches titles that differ only in Unicode composition and surrounding spaces', () => {
    const old = candidate({ title: 'ガ'.normalize('NFD') });

    expect(restorableMatch({ removed: [old], unreadable: [] }, restoring({ title: ' ガ ' }))).toBe(
      old,
    );
  });

  it('prefers an unreadable row over a removed record at the same step', () => {
    const removed = candidate({ id: bookId('removed'), addedAt: 9 });
    const unreadable = candidate({ id: bookId('unreadable'), addedAt: 1 });

    expect(restorableMatch({ removed: [removed], unreadable: [unreadable] }, restoring())).toBe(
      unreadable,
    );
  });

  it('prefers the most recently added candidate within a kind', () => {
    const older = candidate({ id: bookId('older'), addedAt: 1 });
    const newer = candidate({ id: bookId('newer'), addedAt: 2 });

    expect(restorableMatch({ removed: [older, newer], unreadable: [] }, restoring())).toBe(newer);
  });
});
