import { describe, expect, it } from 'vitest';
import { bookTitle, plausibleTitle, suggestTitle } from './title';

describe('suggestTitle', () => {
  it('falls back for an empty list', () => {
    expect(suggestTitle('images', [])).toBe('Untitled');
  });

  it.each([
    ['archive', 'Volume One.cbz', 'Volume One'],
    ['images', '.gitignore', '.gitignore'],
  ] as const)(
    'names a single loose %s file after itself, without its extension',
    (sourceKind, name, title) => {
      expect(suggestTitle(sourceKind, [{ name, path: '' }])).toBe(title);
    },
  );

  it.each([
    ['a single file inside a folder', [{ name: 'page1.jpg', path: 'My Manga/page1.jpg' }]],
    [
      'a folder of files',
      [
        { name: 'page1.jpg', path: 'My Manga/page1.jpg' },
        { name: 'page2.jpg', path: 'My Manga/page2.jpg' },
      ],
    ],
  ])('names %s after the folder', (_, entries) => {
    expect(suggestTitle('images', entries)).toBe('My Manga');
  });

  it('names several loose files after the first of them', () => {
    expect(
      suggestTitle('images', [
        { name: 'page1.jpg', path: '' },
        { name: 'page2.jpg', path: '' },
      ]),
    ).toBe('page1');
  });

  it('takes only the first segment of a deeply nested path', () => {
    expect(
      suggestTitle('images', [{ name: 'page1.jpg', path: 'My Manga/vol1/ch2/page1.jpg' }]),
    ).toBe('My Manga');
  });

  it('falls back when the name holds nothing but whitespace', () => {
    expect(suggestTitle('images', [{ name: '   ', path: '' }])).toBe('Untitled');
  });

  it('skips a folder segment that holds nothing but whitespace', () => {
    expect(suggestTitle('images', [{ name: 'page1.jpg', path: '   /page1.jpg' }])).toBe('page1');
  });

  it('names a container inside a folder after its own file, not the folder', () => {
    expect(suggestTitle('pdf', [{ name: 'vol1.pdf', path: 'Series/vol1.pdf' }])).toBe('vol1');
    expect(suggestTitle('archive', [{ name: 'vol2.cbz', path: 'Series/vol2.cbz' }])).toBe('vol2');
    expect(suggestTitle('epub', [{ name: 'vol3.epub', path: 'Series/Box/vol3.epub' }])).toBe(
      'vol3',
    );
  });

  it('falls back for a container whose name holds nothing but whitespace', () => {
    expect(suggestTitle('pdf', [{ name: '   .pdf', path: 'Series/   .pdf' }])).toBe('Untitled');
  });
});

describe('bookTitle', () => {
  it('takes the declared title, trimmed', () => {
    expect(bookTitle('  キノの旅  ', 'kino-v1')).toBe('キノの旅');
  });

  it.each([null, '', '   '])('takes the file title when the declared title is %j', (declared) => {
    expect(bookTitle(declared, 'kino-v1')).toBe('kino-v1');
  });
});

describe('plausibleTitle', () => {
  it.each([
    ['  よつばと! 1  ', 'よつばと! 1'],
    ['Akira Vol. 1', 'Akira Vol. 1'],
    ['Untitled Goose: A History', 'Untitled Goose: A History'],
    ['Chapter 1/2', 'Chapter 1/2'],
    ['PDF Basics', 'PDF Basics'],
  ])('passes the real title %j, trimmed', (declared, title) => {
    expect(plausibleTitle(declared)).toBe(title);
  });

  it.each([
    '',
    '   ',
    'untitled',
    'Untitled',
    'Untitled Document',
    'Microsoft Word - chapter01.doc',
    'scan_0001.docx',
    'Akira_v01.pdf',
    'Akira_v01.PDF',
    'cover.indd',
    'notes.rtf',
    'draft.odt',
    'C:\\Users\\scan\\akira',
    'D:/scans/akira',
    '\\\\server\\share\\akira',
    '/Users/jh/Desktop/akira',
    '~/Desktop/akira',
    'Volumes\\akira',
  ])('rejects the authoring-tool leftover %j', (declared) => {
    expect(plausibleTitle(declared)).toBeNull();
  });
});
