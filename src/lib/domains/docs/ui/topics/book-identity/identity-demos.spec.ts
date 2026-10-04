import { describe, expect, it } from 'vitest';
import { bytesSampled, hashedBooks, matchOutcome, sampleSpans } from './identity-demos';
import type { DescribedUpload, Holding } from './identity-demos';

function entry(name: string, size: number, webkitRelativePath = '') {
  return { name, size, webkitRelativePath };
}

function holding(id: string, kind: Holding['kind'], fields: Partial<Holding> = {}): Holding {
  return {
    id,
    kind,
    title: `Title ${id}`,
    fileName: `${id}.cbz`,
    contentHash: `hash-${id}`,
    addedAt: 1,
    ...fields,
  };
}

const UPLOAD: DescribedUpload = {
  contentHash: 'hash-upload',
  fileName: 'upload.cbz',
  title: 'Upload title',
  fileTitle: 'upload',
};

describe('sampleSpans', () => {
  it('reads two whole samples and a short third one from a 5000-byte file', () => {
    const read = sampleSpans(5000).filter((span) => span.kind === 'read');

    expect(read).toEqual([
      { kind: 'read', offset: 0, length: 1024 },
      { kind: 'read', offset: 1024, length: 1024 },
      { kind: 'read', offset: 4096, length: 904 },
    ]);
  });

  it('lists all twelve offsets, past the end or not', () => {
    expect(sampleSpans(0).map((span) => span.offset)).toEqual([
      0, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864, 268435456,
      1073741824,
    ]);
  });

  it.each([
    [0, 0],
    [1, 1],
    [1023, 1023],
    [1025, 1025],
    [5000, 2952],
    [70000, 5120],
    [300000, 6144],
    [1048576, 6144],
    [1048577, 6145],
    [1500000, 7168],
  ])('counts the bytes KOReader samples from a %i-byte file', (size, sampled) => {
    expect(bytesSampled(size)).toBe(sampled);
  });
});

describe('hashedBooks', () => {
  it('hashes a lone container file itself, under its own name', () => {
    const pdf = entry('Akira 01.pdf', 4000);

    expect(hashedBooks([pdf])).toEqual([
      { fileName: 'Akira 01.pdf', part: { kind: 'file', file: pdf }, ignored: [] },
    ]);
  });

  it('hashes a folder by the sorted manifest of its page images and ignores junk', () => {
    const second = entry('002.jpg', 20, 'Vol 1/002.jpg');
    const first = entry('001.jpg', 10, 'Vol 1/001.jpg');
    const junk = entry('.DS_Store', 6148, 'Vol 1/.DS_Store');

    const [book] = hashedBooks([second, junk, first]);

    expect(book?.fileName).toBe('Vol 1');
    expect(book?.part).toEqual({
      kind: 'manifest',
      manifest: '["001.jpg",10]\n["002.jpg",20]',
      kept: [second, first],
    });
    expect(book?.ignored).toEqual([junk]);
  });

  it('splits two container files into two books', () => {
    const books = hashedBooks([entry('b.epub', 5), entry('a.pdf', 5)]);

    expect(books.map((book) => book.fileName)).toEqual(['a.pdf', 'b.epub']);
  });
});

describe('matchOutcome', () => {
  it('joins a shelf book with the same hash and merges the unreadable row with its title', () => {
    const shelf = holding('a', 'shelf', { contentHash: UPLOAD.contentHash, title: 'Akira' });
    const stray = holding('b', 'unreadable', { title: 'Akira' });

    expect(matchOutcome([shelf, stray], UPLOAD, 'content')).toEqual({
      kind: 'already-held',
      join: 'by-content',
      holding: shelf,
      merged: [stray],
    });
  });

  it('adds a book whose name alone matches a shelf book when matching by content', () => {
    const shelf = holding('a', 'shelf', { fileName: UPLOAD.fileName });

    expect(matchOutcome([shelf], UPLOAD, 'content')).toEqual({ kind: 'added' });
  });

  it('joins a shelf book by its name when matching by file name', () => {
    const shelf = holding('a', 'shelf', { fileName: UPLOAD.fileName });

    expect(matchOutcome([shelf], UPLOAD, 'file-name')).toMatchObject({
      kind: 'already-held',
      join: 'by-name',
      holding: shelf,
    });
  });

  it('restores by hash before a file name match, even when the name match is unreadable', () => {
    const named = holding('a', 'unreadable', { fileName: UPLOAD.fileName });
    const hashed = holding('b', 'removed', { contentHash: UPLOAD.contentHash });

    expect(matchOutcome([named, hashed], UPLOAD, 'content')).toEqual({
      kind: 'restored',
      holding: hashed,
      step: 'content',
    });
  });

  it('restores an unreadable row before a removed record at the same step', () => {
    const removed = holding('a', 'removed', { fileName: UPLOAD.fileName, addedAt: 9 });
    const unreadable = holding('b', 'unreadable', { fileName: UPLOAD.fileName, addedAt: 1 });

    expect(matchOutcome([removed, unreadable], UPLOAD, 'content')).toMatchObject({
      holding: unreadable,
      step: 'file-name',
    });
  });

  it('restores the newest of two removed records that share a title', () => {
    const older = holding('a', 'removed', { title: UPLOAD.title, addedAt: 1 });
    const newer = holding('b', 'removed', { title: UPLOAD.title, addedAt: 2 });

    expect(matchOutcome([older, newer], UPLOAD, 'content')).toMatchObject({
      holding: newer,
      step: 'title',
    });
  });

  it('restores by the file-name title when the metadata title differs', () => {
    const removed = holding('a', 'removed', { title: UPLOAD.fileTitle });

    expect(matchOutcome([removed], UPLOAD, 'content')).toMatchObject({ step: 'title' });
  });

  it('matches no title on "Untitled book"', () => {
    const removed = holding('a', 'removed', { title: 'Untitled book' });

    expect(matchOutcome([removed], { ...UPLOAD, title: 'Untitled book' }, 'content')).toEqual({
      kind: 'added',
    });
  });

  it('adds the upload beside a shelf book whose hash is a SHA-256 of the old form', () => {
    const legacy = holding('a', 'shelf', { contentHash: 'f'.repeat(64), title: UPLOAD.title });

    expect(matchOutcome([legacy], UPLOAD, 'content')).toEqual({ kind: 'added' });
  });
});
