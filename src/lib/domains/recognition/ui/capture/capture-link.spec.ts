import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex } from '$lib/shared/ids';
import { captureLink } from './capture-link';

const PASSAGE = textAnchor('epubcfi(/6/4!/4/2/1:0)', { exact: '海', prefix: '', suffix: '' }, null);

const PAGE = regionAnchor([{ index: imageIndex(6), rect: imageRect(0, 0, 10, 10) }]);

const BESIDE = regionAnchor([
  { index: imageIndex(6), rect: imageRect(120.4567, 33.3333, 48.5, 90.125) },
  { index: imageIndex(7), rect: imageRect(0, 0, 10, 10) },
]);

describe('captureLink', () => {
  it('opens an image book at the image and region of a capture anchored on it, naming no capture id', () => {
    expect(captureLink(bookId('one'), { anchor: PAGE }, null)).toEqual({
      href: '/read/one?image=6&region=0,0,10,10',
      jump: 'Jump to p.007',
    });
  });

  it('names the second capture on an image by its own first region', () => {
    expect(captureLink(bookId('one'), { anchor: BESIDE }, '海').href).toBe(
      '/read/one?image=6&region=120.46,33.33,48.5,90.13&find=%E6%B5%B7',
    );
  });

  it('opens a flow book at the passage of a capture anchored in text, by its cfi', () => {
    expect(captureLink(bookId('one'), { anchor: PASSAGE }, null)).toEqual({
      href: '/read/one?cfi=epubcfi(%2F6%2F4!%2F4%2F2%2F1%3A0)',
      jump: 'Jump to the passage',
    });
  });

  it('carries the search to a passage as it does to a page', () => {
    expect(captureLink(bookId('one'), { anchor: PASSAGE }, '海').href).toBe(
      '/read/one?cfi=epubcfi(%2F6%2F4!%2F4%2F2%2F1%3A0)&find=%E6%B5%B7',
    );
  });

  it('opens the book for a capture anchored to no region', () => {
    expect(captureLink(bookId('one'), { anchor: regionAnchor([]) }, null)).toEqual({
      href: '/read/one',
      jump: 'Open the book',
    });
  });
});
