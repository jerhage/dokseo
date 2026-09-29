import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { captureLink } from './capture-link';

const PASSAGE = textAnchor('epubcfi(/6/4!/4/2/1:0)', { exact: '海', prefix: '', suffix: '' });

const PAGE = regionAnchor([{ index: imageIndex(6), rect: imageRect(0, 0, 10, 10) }]);

describe('captureLink', () => {
  it('opens an image book at the page of a capture anchored on it', () => {
    expect(captureLink(bookId('one'), { id: captureId('c1'), anchor: PAGE }, null)).toEqual({
      href: '/read/one?image=6&capture=c1',
      jump: 'Jump to p.007',
    });
  });

  it('opens a flow book at the passage of a capture anchored in text', () => {
    expect(captureLink(bookId('one'), { id: captureId('c1'), anchor: PASSAGE }, null)).toEqual({
      href: '/read/one?capture=c1',
      jump: 'Jump to the passage',
    });
  });

  it('carries the search to a passage as it does to a page', () => {
    expect(captureLink(bookId('one'), { id: captureId('c1'), anchor: PASSAGE }, '海').href).toBe(
      '/read/one?find=%E6%B5%B7&capture=c1',
    );
  });

  it('opens the book for a capture anchored to no region', () => {
    expect(
      captureLink(bookId('one'), { id: captureId('c1'), anchor: regionAnchor([]) }, null),
    ).toEqual({ href: '/read/one', jump: 'Open the book' });
  });
});
