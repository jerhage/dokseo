import { describe, expect, it } from 'vitest';
import { resolveEpubPages } from './epub-pages';
import type { PageDocumentReader } from './epub-pages';
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

function archive(documents: ReadonlyMap<string, string>): {
  readonly asked: string[];
  readonly read: PageDocumentReader;
} {
  const asked: string[] = [];
  return {
    asked,
    read: (path: string) => {
      asked.push(path);
      return Promise.resolve(documents.get(path) ?? null);
    },
  };
}

function readingOf(documents: ReadonlyMap<string, string>): PageDocumentReader {
  return archive(documents).read;
}

describe('resolveEpubPages', () => {
  it('keeps the spine order rather than the order the filenames sort in', async () => {
    expect(await resolveEpubPages(THREE, readingOf(DOCUMENTS))).toEqual({
      kind: 'images',
      images: [
        { page: 'OEBPS/text/002.xhtml', image: 'OEBPS/images/002.jpg' },
        { page: 'OEBPS/text/003.xhtml', image: 'OEBPS/images/003.jpg' },
        { page: 'OEBPS/text/001.xhtml', image: 'OEBPS/images/001.jpg' },
      ],
    });
  });

  it('refuses the book at the first page holding two images, naming that page', async () => {
    const documents = new Map(DOCUMENTS);
    documents.set(
      'OEBPS/text/003.xhtml',
      '<html><body><img src="../images/003.jpg"/><img src="../images/004.jpg"/></body></html>',
    );

    expect(await resolveEpubPages(THREE, readingOf(documents))).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'many-images', path: 'OEBPS/text/003.xhtml', count: 2 },
    });
  });

  it('refuses the book at a page carrying text beside its image', async () => {
    const documents = new Map(DOCUMENTS);
    documents.set(
      'OEBPS/text/002.xhtml',
      '<html><body><img src="../images/002.jpg"/><p>ごあいさつ</p></body></html>',
    );

    expect(await resolveEpubPages(THREE, readingOf(documents))).toEqual({
      kind: 'not-paged',
      obstacle: {
        kind: 'text-beside-the-image',
        path: 'OEBPS/text/002.xhtml',
        text: 'ごあいさつ',
      },
    });
  });

  it('refuses the book at a page holding no image', async () => {
    const documents = new Map(DOCUMENTS);
    documents.set('OEBPS/text/001.xhtml', '<html><body><p>奥付</p></body></html>');

    expect(await resolveEpubPages(THREE, readingOf(documents))).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'no-image', path: 'OEBPS/text/001.xhtml' },
    });
  });

  it('names a spine page the archive does not hold', async () => {
    const documents = new Map(DOCUMENTS);
    documents.delete('OEBPS/text/003.xhtml');

    expect(await resolveEpubPages(THREE, readingOf(documents))).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'page-missing', path: 'OEBPS/text/003.xhtml' },
    });
  });

  it('carries an unmanifested idref out of the spine as the obstacle', async () => {
    expect(
      await resolveEpubPages({ kind: 'unmanifested', idref: 'p7' }, readingOf(DOCUMENTS)),
    ).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'unmanifested', idref: 'p7' },
    });
  });

  it('refuses a book whose spine could not be read', async () => {
    expect(await resolveEpubPages({ kind: 'unreadable' }, readingOf(DOCUMENTS))).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'spine-unreadable' },
    });
  });

  it('refuses a book whose spine lists no page', async () => {
    expect(await resolveEpubPages({ kind: 'empty' }, readingOf(new Map()))).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'spine-empty' },
    });
  });

  it('reports the first obstacle when a later page holds another', async () => {
    const documents = new Map(DOCUMENTS);
    documents.set('OEBPS/text/003.xhtml', '<html><body/></html>');
    documents.set('OEBPS/text/001.xhtml', '<html><body/></html>');

    expect(await resolveEpubPages(THREE, readingOf(documents))).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'no-image', path: 'OEBPS/text/003.xhtml' },
    });
  });

  it('lets one image serve two spine pages', async () => {
    const spine = spineOver(['a.xhtml', 'b.xhtml']);
    const documents = new Map([
      ['a.xhtml', page('cover.jpg')],
      ['b.xhtml', page('cover.jpg')],
    ]);

    expect(await resolveEpubPages(spine, readingOf(documents))).toEqual({
      kind: 'images',
      images: [
        { page: 'a.xhtml', image: 'cover.jpg' },
        { page: 'b.xhtml', image: 'cover.jpg' },
      ],
    });
  });

  it('refuses a novel whose cover is an image and whose first chapter is prose', async () => {
    const spine = spineOver(['cover.xhtml', 'ch01.xhtml', 'ch02.xhtml']);
    const documents = new Map([
      ['cover.xhtml', page('cover.jpg')],
      ['ch01.xhtml', '<html><body><p>吾輩は猫である。</p></body></html>'],
      ['ch02.xhtml', '<html><body><p>名前はまだ無い。</p></body></html>'],
    ]);

    expect(await resolveEpubPages(spine, readingOf(documents))).toEqual({
      kind: 'not-paged',
      obstacle: { kind: 'no-image', path: 'ch01.xhtml' },
    });
  });

  it('asks for no document past the page that refuses the book', async () => {
    const spine = spineOver([
      'cover.xhtml',
      'ch01.xhtml',
      'ch02.xhtml',
      'ch03.xhtml',
      'ch04.xhtml',
    ]);
    const documents = new Map([
      ['cover.xhtml', page('cover.jpg')],
      ['ch01.xhtml', '<html><body><p>吾輩は猫である。</p></body></html>'],
      ['ch02.xhtml', '<html><body><p>名前はまだ無い。</p></body></html>'],
      ['ch03.xhtml', '<html><body><p>どこで生れたか。</p></body></html>'],
      ['ch04.xhtml', '<html><body><p>見当がつかぬ。</p></body></html>'],
    ]);
    const novel = archive(documents);

    const pages = await resolveEpubPages(spine, novel.read);

    expect(pages.kind).toBe('not-paged');
    expect(novel.asked).toEqual(['cover.xhtml', 'ch01.xhtml']);
  });

  it('asks for every spine page before calling a book paged', async () => {
    const book = archive(DOCUMENTS);

    const pages = await resolveEpubPages(THREE, book.read);

    expect(pages.kind).toBe('images');
    expect(book.asked).toEqual([
      'OEBPS/text/002.xhtml',
      'OEBPS/text/003.xhtml',
      'OEBPS/text/001.xhtml',
    ]);
  });

  it('asks for no document at all when the spine itself is the obstacle', async () => {
    const book = archive(DOCUMENTS);

    await resolveEpubPages({ kind: 'unreadable' }, book.read);

    expect(book.asked).toEqual([]);
  });
});
