import { describe, expect, it } from 'vitest';
import { suggestTitle } from './title';

describe('suggestTitle', () => {
  it('falls back for an empty list', () => {
    expect(suggestTitle('images', [])).toBe('Untitled');
  });

  it('names a single loose file after itself, without its extension', () => {
    expect(suggestTitle('archive', [{ name: 'Volume One.cbz', path: '' }])).toBe('Volume One');
  });

  it('names a single file inside a folder after the folder', () => {
    expect(suggestTitle('images', [{ name: 'page1.jpg', path: 'My Manga/page1.jpg' }])).toBe(
      'My Manga',
    );
  });

  it('names a folder of files after the folder', () => {
    expect(
      suggestTitle('images', [
        { name: 'page1.jpg', path: 'My Manga/page1.jpg' },
        { name: 'page2.jpg', path: 'My Manga/page2.jpg' },
      ]),
    ).toBe('My Manga');
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

  it('keeps a name that is only an extension', () => {
    expect(suggestTitle('images', [{ name: '.gitignore', path: '' }])).toBe('.gitignore');
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
