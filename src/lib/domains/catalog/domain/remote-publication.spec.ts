import { describe, expect, it } from 'vitest';
import { feedPathLabel, formatOfMediaType } from './remote-publication';

describe('formatOfMediaType', () => {
  it.each([
    ['application/epub+zip', 'epub'],
    ['application/pdf', 'pdf'],
    ['application/vnd.comicbook+zip', 'cbz'],
    ['application/x-cbz', 'cbz'],
    ['application/zip', 'cbz'],
    ['Application/EPUB+zip', 'epub'],
    ['application/pdf; charset=binary', 'pdf'],
  ])('maps %s to %s', (mediaType, format) => {
    expect(formatOfMediaType(mediaType)).toBe(format);
  });

  it.each(['audio/mpeg', 'text/html', ''])('reports nothing for %j', (mediaType) => {
    expect(formatOfMediaType(mediaType)).toBeNull();
  });
});

describe('feedPathLabel', () => {
  it('joins the step titles with a separator', () => {
    const path = [
      { title: 'By Series', href: 'https://example.org/a' },
      { title: '星の旅', href: 'https://example.org/b' },
    ];

    expect(feedPathLabel(path)).toBe('By Series › 星の旅');
  });

  it('gives an empty label for an empty path', () => {
    expect(feedPathLabel([])).toBe('');
  });
});
