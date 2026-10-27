import { describe, expect, it } from 'vitest';
import { bookId } from './ids';
import { addressWithKey, readerTarget } from './reader-target';
import { bookKey } from './testing/book-key';

const SHELF = [
  { id: bookId('one'), contentHash: bookKey('one') },
  { id: bookId('two'), contentHash: bookKey('two') },
];

const ELSEWHERE = bookKey('far');

const UNREADABLE = [
  { id: bookId('broken'), contentHash: bookKey('broken') },
  { id: bookId('keyless'), contentHash: 'not a key' },
];

describe('readerTarget', () => {
  it('opens the shelf book whose key is the parameter', () => {
    expect(readerTarget(bookKey('two'), SHELF, [], null)).toEqual({
      kind: 'shelf',
      id: bookId('two'),
      key: bookKey('two'),
    });
  });

  it('opens the shelf book whose id is the parameter and names its key to redirect to', () => {
    expect(readerTarget('one', SHELF, [], null)).toEqual({
      kind: 'shelf-by-id',
      id: bookId('one'),
      key: bookKey('one'),
    });
  });

  it('names a book held on another device when the shelf lacks it', () => {
    expect(readerTarget(ELSEWHERE, SHELF, [], [ELSEWHERE])).toEqual({
      kind: 'remote',
      contentHash: ELSEWHERE,
    });
  });

  it('waits for the remote list when the shelf lacks the parameter', () => {
    expect(readerTarget(ELSEWHERE, SHELF, [], null)).toEqual({ kind: 'awaiting-remote' });
  });

  it('reports a parameter that no shelf book and no remote book carries as not found', () => {
    expect(readerTarget(bookKey('lost'), SHELF, [], [ELSEWHERE])).toEqual({ kind: 'not-found' });
  });

  it('reports an unreadable row whose key is the parameter, with that key', () => {
    expect(readerTarget(bookKey('broken'), SHELF, UNREADABLE, [])).toEqual({
      kind: 'unreadable',
      id: bookId('broken'),
      key: bookKey('broken'),
    });
  });

  it('reports an unreadable row whose id is the parameter, with no key when its hash is malformed', () => {
    expect(readerTarget('keyless', SHELF, UNREADABLE, [])).toEqual({
      kind: 'unreadable',
      id: bookId('keyless'),
      key: null,
    });
  });

  it('prefers the shelf over the remote list for a key held in both', () => {
    expect(readerTarget(bookKey('one'), SHELF, [], [bookKey('one')]).kind).toBe('shelf');
  });
});

describe('addressWithKey', () => {
  it('replaces the book in the path and keeps every query parameter and the fragment', () => {
    const moved = addressWithKey(
      new URL('https://r.test/read/one?image=3&region=0,0,0.1,0.1&find=%E7%8C%AB#top'),
      bookKey('one'),
    );

    expect(moved.href).toBe(
      `https://r.test/read/${bookKey('one')}?image=3&region=0,0,0.1,0.1&find=%E7%8C%AB#top`,
    );
  });
});
