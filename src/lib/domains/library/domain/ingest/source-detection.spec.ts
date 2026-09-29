import { describe, expect, it } from 'vitest';
import { at } from '$lib/shared/testing/at';
import { detectSourceKind, fingerprintedFiles, splitUpload } from './source-detection';
import type { UploadBook, UploadEntry } from './source-detection';

describe('detectSourceKind', () => {
  it('detects a single pdf', () => {
    expect(detectSourceKind(['chapter.pdf'])).toBe('pdf');
  });

  it('detects a single zip', () => {
    expect(detectSourceKind(['chapter.zip'])).toBe('archive');
  });

  it('detects a single cbz', () => {
    expect(detectSourceKind(['chapter.cbz'])).toBe('archive');
  });

  it('detects a single epub', () => {
    expect(detectSourceKind(['volume-1.epub'])).toBe('epub');
  });

  it('ignores the case of the container extension', () => {
    expect(detectSourceKind(['chapter.EPUB'])).toBe('epub');
    expect(detectSourceKind(['chapter.PDF'])).toBe('pdf');
    expect(detectSourceKind(['chapter.ZiP'])).toBe('archive');
    expect(detectSourceKind(['chapter.CBZ'])).toBe('archive');
  });

  it('judges the extension of the basename, not of a folder', () => {
    expect(detectSourceKind(['vol1.pdf/chapter.pdf'])).toBe('pdf');
    expect(detectSourceKind(['vol1.pdf/notes.txt'])).toBe(null);
  });

  it('falls to images when a pdf arrives alongside an image', () => {
    expect(detectSourceKind(['chapter.pdf', 'page1.jpg'])).toBe('images');
  });

  it('falls to images when an archive arrives alongside an image', () => {
    expect(detectSourceKind(['chapter.cbz', 'page1.png'])).toBe('images');
  });

  it('returns null for two pdfs, because neither the single-container nor the image rule matches', () => {
    expect(detectSourceKind(['one.pdf', 'two.pdf'])).toBe(null);
  });

  it('returns null for two archives, for the same reason', () => {
    expect(detectSourceKind(['one.zip', 'two.cbz'])).toBe(null);
  });

  it('detects loose images', () => {
    expect(detectSourceKind(['page1.jpg', 'page2.png', 'page3.webp'])).toBe('images');
  });

  it('detects a single loose image', () => {
    expect(detectSourceKind(['cover.jpg'])).toBe('images');
  });

  it('detects a dropped folder of images by its relative paths', () => {
    expect(detectSourceKind(['vol1/page1.jpg', 'vol1/page2.jpg'])).toBe('images');
  });

  it('detects images when only one entry of many is an image', () => {
    expect(detectSourceKind(['ComicInfo.xml', 'notes.txt', 'vol1/page1.jpg'])).toBe('images');
  });

  it('returns null when nothing is usable', () => {
    expect(detectSourceKind(['notes.txt', 'ComicInfo.xml'])).toBe(null);
  });

  it('returns null for an empty list', () => {
    expect(detectSourceKind([])).toBe(null);
  });

  it('returns null for a name with no extension', () => {
    expect(detectSourceKind(['chapter'])).toBe(null);
    expect(detectSourceKind(['vol1/chapter'])).toBe(null);
  });

  it('returns null for a dotfile whose whole name looks like an extension', () => {
    expect(detectSourceKind(['.pdf'])).toBe(null);
    expect(detectSourceKind(['.cbz'])).toBe(null);
    expect(detectSourceKind(['.jpg'])).toBe(null);
  });

  it('returns null for an empty name', () => {
    expect(detectSourceKind([''])).toBe(null);
  });

  it('does not treat a rar or a 7z as an archive', () => {
    expect(detectSourceKind(['chapter.cbr'])).toBe(null);
    expect(detectSourceKind(['chapter.7z'])).toBe(null);
  });

  it('does not treat a directory entry as a container', () => {
    expect(detectSourceKind(['chapter.zip/'])).toBe(null);
  });

  it('returns null for a lone resource fork that looks like a container', () => {
    expect(detectSourceKind(['Blame/._vol1.pdf'])).toBe(null);
  });

  it('returns null when the only images are junk', () => {
    expect(detectSourceKind(['._page1.jpg', '__MACOSX/page2.jpg', '.hidden.png'])).toBe(null);
  });
});

function entry(name: string, webkitRelativePath = ''): UploadEntry {
  return { name, webkitRelativePath };
}

function shapeOf(books: readonly UploadBook<UploadEntry>[]): readonly (readonly string[])[] {
  return books.map((book) => [
    book.sourceKind,
    ...book.files.map((file) => file.webkitRelativePath || file.name),
  ]);
}

describe('splitUpload', () => {
  it('makes one book of a single pdf', () => {
    expect(shapeOf(splitUpload([entry('chapter.pdf')]))).toEqual([['pdf', 'chapter.pdf']]);
  });

  it('makes one book of each of several pdfs', () => {
    expect(shapeOf(splitUpload([entry('b.pdf'), entry('a.pdf'), entry('c.pdf')]))).toEqual([
      ['pdf', 'a.pdf'],
      ['pdf', 'b.pdf'],
      ['pdf', 'c.pdf'],
    ]);
  });

  it('orders the container books naturally, so volume 2 comes before volume 10', () => {
    expect(shapeOf(splitUpload([entry('vol 10.cbz'), entry('vol 2.cbz')]))).toEqual([
      ['archive', 'vol 2.cbz'],
      ['archive', 'vol 10.cbz'],
    ]);
  });

  it('makes one book of an epub and one of a cbz, each with its own kind', () => {
    expect(shapeOf(splitUpload([entry('novel.epub'), entry('manga.cbz')]))).toEqual([
      ['archive', 'manga.cbz'],
      ['epub', 'novel.epub'],
    ]);
  });

  it('makes one book of loose images, keeping every file in the order it arrived', () => {
    const files = [entry('page2.png'), entry('page1.jpg'), entry('ComicInfo.xml')];

    expect(shapeOf(splitUpload(files))).toEqual([
      ['images', 'page2.png', 'page1.jpg', 'ComicInfo.xml'],
    ]);
    expect(at(splitUpload(files), 0).files).toEqual(files);
  });

  it('makes one book of each container and one of the images in a mixed upload', () => {
    const upload = [
      entry('page1.jpg'),
      entry('one.pdf'),
      entry('page2.jpg'),
      entry('two.pdf'),
      entry('three.zip'),
    ];

    expect(shapeOf(splitUpload(upload))).toEqual([
      ['pdf', 'one.pdf'],
      ['archive', 'three.zip'],
      ['pdf', 'two.pdf'],
      ['images', 'page1.jpg', 'page2.jpg'],
    ]);
  });

  it('returns no book when nothing is usable', () => {
    expect(splitUpload([entry('notes.txt'), entry('ComicInfo.xml')])).toEqual([]);
    expect(splitUpload([])).toEqual([]);
  });

  it('ignores files that are neither a container nor an image beside a container', () => {
    expect(shapeOf(splitUpload([entry('notes.txt'), entry('chapter.pdf')]))).toEqual([
      ['pdf', 'chapter.pdf'],
    ]);
  });

  it('keeps the images of a dropped folder together as one book, however deep they sit', () => {
    const upload = [
      entry('001.jpg', 'Blame/ch1/001.jpg'),
      entry('002.jpg', 'Blame/ch2/002.jpg'),
      entry('vol2.cbz', 'Blame/vol2.cbz'),
    ];

    expect(shapeOf(splitUpload(upload))).toEqual([
      ['archive', 'Blame/vol2.cbz'],
      ['images', 'Blame/ch1/001.jpg', 'Blame/ch2/002.jpg'],
    ]);
  });

  it('ignores the case of every extension', () => {
    expect(
      shapeOf(splitUpload([entry('A.PDF'), entry('B.Cbz'), entry('C.EPUB'), entry('p.JPG')])),
    ).toEqual([
      ['pdf', 'A.PDF'],
      ['archive', 'B.Cbz'],
      ['epub', 'C.EPUB'],
      ['images', 'p.JPG'],
    ]);
  });

  it('makes no book of a macOS resource fork that only looks like a container', () => {
    const upload = [
      entry('._vol1.pdf', 'Blame/._vol1.pdf'),
      entry('vol1.pdf', 'Blame/vol1.pdf'),
      entry('vol2.zip', '__MACOSX/Blame/vol2.zip'),
    ];

    expect(shapeOf(splitUpload(upload))).toEqual([['pdf', 'Blame/vol1.pdf']]);
  });

  it('makes no images book of a folder whose only images are junk', () => {
    const upload = [
      entry('vol1.pdf', 'Blame/vol1.pdf'),
      entry('._page1.jpg', 'Blame/._page1.jpg'),
      entry('page2.jpg', 'Blame/__MACOSX/page2.jpg'),
      entry('.cover.png', 'Blame/.cover.png'),
      entry('.DS_Store', 'Blame/.DS_Store'),
    ];

    expect(shapeOf(splitUpload(upload))).toEqual([['pdf', 'Blame/vol1.pdf']]);
  });

  it('agrees with detectSourceKind on the kind of every book it makes', () => {
    const upload = [entry('a.pdf'), entry('b.cbz'), entry('c.epub'), entry('p1.png')];

    for (const book of splitUpload(upload)) {
      expect(detectSourceKind(book.files.map((file) => file.name))).toBe(book.sourceKind);
    }
  });
});

describe('fingerprintedFiles', () => {
  it('keeps only the pages of an images book, in the order they came', () => {
    const pages = [entry('002.png', 'Ch 1/002.png'), entry('001.png', 'Ch 1/001.png')];
    const upload = [
      entry('.DS_Store', 'Ch 1/.DS_Store'),
      at(pages, 0),
      entry('._002.png', 'Ch 1/._002.png'),
      entry('Thumbs.db', 'Ch 1/Thumbs.db'),
      entry('notes.txt', 'Ch 1/notes.txt'),
      at(pages, 1),
      entry('001.png', 'Ch 1/__MACOSX/001.png'),
    ];

    expect(fingerprintedFiles(upload)).toEqual(pages);
  });

  it('keeps the one file of a container book', () => {
    const container = [entry('vol1.cbz', 'Series/vol1.cbz')];

    expect(fingerprintedFiles(container)).toEqual(container);
  });
});
