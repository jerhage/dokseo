import { describe, expect, it } from 'vitest';
import { resolveEpubPages } from './epub-pages';
import type { EpubSpine } from './epub-spine';

function page(source: string): string {
  return `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>p</title></head>
    <body><img src="${source}"/></body></html>`;
}

function spineOver(paths: readonly string[]): EpubSpine {
  return { kind: 'spine', paths };
}

const THREE: EpubSpine = spineOver([
  'OEBPS/text/002.xhtml',
  'OEBPS/text/003.xhtml',
  'OEBPS/text/001.xhtml',
]);

const DOCUMENTS: ReadonlyMap<string, string> = new Map([
  ['OEBPS/text/001.xhtml', page('../images/001.jpg')],
  ['OEBPS/text/002.xhtml', page('../images/002.jpg')],
  ['OEBPS/text/003.xhtml', page('../images/003.jpg')],
]);

describe('resolveEpubPages', () => {
  it('keeps the spine order rather than the order the filenames sort in', () => {
    expect(resolveEpubPages(THREE, DOCUMENTS)).toEqual({
      kind: 'images',
      images: [
        { page: 'OEBPS/text/002.xhtml', image: 'OEBPS/images/002.jpg' },
        { page: 'OEBPS/text/003.xhtml', image: 'OEBPS/images/003.jpg' },
        { page: 'OEBPS/text/001.xhtml', image: 'OEBPS/images/001.jpg' },
      ],
    });
  });

  it('refuses the book at the first page holding two images, naming that page', () => {
    const documents = new Map(DOCUMENTS);
    documents.set(
      'OEBPS/text/003.xhtml',
      '<html><body><img src="../images/003.jpg"/><img src="../images/004.jpg"/></body></html>',
    );

    expect(resolveEpubPages(THREE, documents)).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'many-images', path: 'OEBPS/text/003.xhtml', count: 2 },
    });
  });

  it('refuses the book at a page carrying text beside its image', () => {
    const documents = new Map(DOCUMENTS);
    documents.set(
      'OEBPS/text/002.xhtml',
      '<html><body><img src="../images/002.jpg"/><p>ごあいさつ</p></body></html>',
    );

    expect(resolveEpubPages(THREE, documents)).toEqual({
      kind: 'not-paged',
      obstacle: {
        kind: 'text-beside-the-image',
        path: 'OEBPS/text/002.xhtml',
        text: 'ごあいさつ',
      },
    });
  });

  it('refuses the book at a page holding no image', () => {
    const documents = new Map(DOCUMENTS);
    documents.set('OEBPS/text/001.xhtml', '<html><body><p>奥付</p></body></html>');

    expect(resolveEpubPages(THREE, documents)).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'no-image', path: 'OEBPS/text/001.xhtml' },
    });
  });

  it('names a spine page the archive does not hold', () => {
    const documents = new Map(DOCUMENTS);
    documents.delete('OEBPS/text/003.xhtml');

    expect(resolveEpubPages(THREE, documents)).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'page-missing', path: 'OEBPS/text/003.xhtml' },
    });
  });

  it('carries an unmanifested idref out of the spine as the obstacle', () => {
    expect(resolveEpubPages({ kind: 'unmanifested', idref: 'p7' }, DOCUMENTS)).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'unmanifested', idref: 'p7' },
    });
  });

  it('refuses a book whose spine could not be read', () => {
    expect(resolveEpubPages({ kind: 'unreadable' }, DOCUMENTS)).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'spine-unreadable' },
    });
  });

  it('refuses a book whose spine lists no page', () => {
    expect(resolveEpubPages({ kind: 'empty' }, new Map())).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'spine-empty' },
    });
  });

  it('reports the first obstacle when a later page holds another', () => {
    const documents = new Map(DOCUMENTS);
    documents.set('OEBPS/text/003.xhtml', '<html><body/></html>');
    documents.set('OEBPS/text/001.xhtml', '<html><body/></html>');

    expect(resolveEpubPages(THREE, documents)).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'no-image', path: 'OEBPS/text/003.xhtml' },
    });
  });

  it('lets one image serve two spine pages', () => {
    const spine = spineOver(['a.xhtml', 'b.xhtml']);
    const documents = new Map([
      ['a.xhtml', page('cover.jpg')],
      ['b.xhtml', page('cover.jpg')],
    ]);

    expect(resolveEpubPages(spine, documents)).toEqual({
      kind: 'images',
      images: [
        { page: 'a.xhtml', image: 'cover.jpg' },
        { page: 'b.xhtml', image: 'cover.jpg' },
      ],
    });
  });
});
