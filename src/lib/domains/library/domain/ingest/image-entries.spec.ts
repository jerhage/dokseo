import { describe, expect, it } from 'vitest';
import { isImageEntry, isJunk, isPageImage, selectImageEntries } from './image-entries';

describe('isImageEntry', () => {
  it('accepts every supported extension in lower case', () => {
    const names = ['a.jpg', 'a.jpeg', 'a.png', 'a.webp', 'a.gif', 'a.bmp', 'a.avif'];
    expect(names.filter(isImageEntry)).toEqual(names);
  });

  it('accepts every supported extension in upper case', () => {
    const names = ['a.JPG', 'a.JPEG', 'a.PNG', 'a.WEBP', 'a.GIF', 'a.BMP', 'a.AVIF'];
    expect(names.filter(isImageEntry)).toEqual(names);
  });

  it('accepts a mixed case extension', () => {
    expect(isImageEntry('cover.JpEg')).toBe(true);
  });

  it('rejects an extension that is not an image', () => {
    expect(isImageEntry('notes.txt')).toBe(false);
    expect(isImageEntry('book.pdf')).toBe(false);
    expect(isImageEntry('nested.zip')).toBe(false);
  });

  it('rejects a name with no extension', () => {
    expect(isImageEntry('cover')).toBe(false);
    expect(isImageEntry('')).toBe(false);
  });

  it('rejects a dotfile whose whole name looks like an extension', () => {
    expect(isImageEntry('.jpg')).toBe(false);
  });

  it('judges the extension of the basename, not of a folder', () => {
    expect(isImageEntry('chapter.jpg/notes.txt')).toBe(false);
    expect(isImageEntry('chapter.txt/page1.jpg')).toBe(true);
  });

  it('rejects a directory entry', () => {
    expect(isImageEntry('images/')).toBe(false);
  });
});

describe('selectImageEntries', () => {
  it('returns an empty list for an empty input', () => {
    expect(selectImageEntries([])).toEqual([]);
  });

  it('keeps only the image entries', () => {
    expect(selectImageEntries(['b.png', 'notes.txt', 'a.jpg', 'ComicInfo.xml'])).toEqual([
      'a.jpg',
      'b.png',
    ]);
  });

  it('rejects a __MACOSX entry even when it ends in an image extension', () => {
    expect(selectImageEntries(['__MACOSX/page1.jpg', 'page1.jpg'])).toEqual(['page1.jpg']);
  });

  it('rejects a __MACOSX segment nested deeper in the path', () => {
    expect(selectImageEntries(['vol1/__MACOSX/vol1/page1.jpg'])).toEqual([]);
  });

  it('rejects an AppleDouble sidecar', () => {
    expect(selectImageEntries(['._page1.jpg', 'vol1/._page2.png'])).toEqual([]);
  });

  it('rejects .DS_Store and Thumbs.db anywhere in the tree', () => {
    expect(
      selectImageEntries(['.DS_Store', 'vol1/.ds_store', 'Thumbs.db', 'vol1/thumbs.db']),
    ).toEqual([]);
  });

  it('rejects a hidden image file and anything inside a hidden folder', () => {
    expect(selectImageEntries(['.cover.jpg', 'vol1/.thumbs/page1.jpg', 'vol1/page1.jpg'])).toEqual([
      'vol1/page1.jpg',
    ]);
  });

  it('keeps an image whose path starts at the current folder', () => {
    expect(selectImageEntries(['./page1.jpg'])).toEqual(['./page1.jpg']);
  });

  it('rejects a directory entry that ends in a slash', () => {
    expect(selectImageEntries(['vol1/', 'weird.jpg/', 'vol1/page1.jpg'])).toEqual([
      'vol1/page1.jpg',
    ]);
  });

  it('accepts an image nested in folders', () => {
    expect(selectImageEntries(['vol1/ch2/page1.jpg'])).toEqual(['vol1/ch2/page1.jpg']);
  });

  it('orders naturally, so page2 comes before page10', () => {
    expect(selectImageEntries(['page10.jpg', 'page2.jpg', 'page1.jpg'])).toEqual([
      'page1.jpg',
      'page2.jpg',
      'page10.jpg',
    ]);
  });

  it('gives the same order whichever way the input is arranged', () => {
    const names = ['vol1/page10.png', 'vol1/page2.PNG', 'A.jpg', 'a.jpg', 'vol1/page2.png'];
    const forward = selectImageEntries(names);
    const reversed = selectImageEntries(names.toReversed());
    const sorted = selectImageEntries(names.toSorted());
    expect(forward).toEqual(reversed);
    expect(forward).toEqual(sorted);
  });

  it('leaves the caller list untouched', () => {
    const names = ['b.jpg', 'a.jpg'];
    selectImageEntries(names);
    expect(names).toEqual(['b.jpg', 'a.jpg']);
  });
});

describe('isJunk', () => {
  it('names every macOS and Windows leftover as junk, wherever it sits', () => {
    const junk = [
      '._vol1.pdf',
      'Blame/._page1.jpg',
      '__MACOSX/Blame/page1.jpg',
      '.DS_Store',
      'Blame/.DS_Store',
      'Thumbs.db',
      'Blame/desktop.ini',
      'Blame/Desktop.ini',
      '.hidden.cbz',
      'Blame/.cache/page1.jpg',
    ];
    expect(junk.filter((name) => !isJunk(name))).toEqual([]);
  });

  it('passes an ordinary file, a dotted name and a relative path', () => {
    const kept = ['vol1.pdf', 'Blame/page1.jpg', 'Blame/vol.1.cbz', './page1.jpg', '../page1.jpg'];
    expect(kept.filter(isJunk)).toEqual([]);
  });
});

describe('isPageImage', () => {
  it('passes an image and rejects junk, a directory and a non-image', () => {
    const names = ['page1.jpg', '._page1.jpg', 'page1.jpg/', 'notes.txt', '.page2.png'];
    expect(names.filter(isPageImage)).toEqual(['page1.jpg']);
  });
});
