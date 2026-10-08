import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import {
  filterKey,
  formatBytes,
  headerFieldKey,
  isSearching,
  librarySummary,
  matchedText,
  narrowedBooks,
  storageText,
  titledBooks,
} from './library-overview';

function book(title: string, imageCount = 10): Book {
  return {
    id: bookId(title),
    title,
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
  };
}

describe('formatBytes', () => {
  it.each([
    { bytes: 1023, text: '1023 B' },
    { bytes: 1024, text: '1.0 KB' },
    { bytes: 1536, text: '1.5 KB' },
    { bytes: 10 * 1024 * 1024, text: '10 MB' },
    { bytes: 2048 * 1024 ** 4, text: '2048 TB' },
  ])('writes $bytes bytes as $text', ({ bytes, text }) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe('storageText', () => {
  it('reports an unknown size when the library size could not be read', () => {
    expect(storageText(null)).toBe('upload size unknown');
  });

  it('reports the stored size of the uploads', () => {
    expect(storageText(2048)).toBe('2.0 KB of uploads');
  });
});

describe('librarySummary', () => {
  it('joins the contents and the stored size', () => {
    expect(librarySummary([book('a', 3), book('b', 4)], 0)).toBe(
      '2 books · 7 images · 0 B of uploads',
    );
  });
});

describe('titledBooks', () => {
  const books = [book('Yotsuba'), book('Berserk')];

  it('keeps every book when the query is blank', () => {
    expect(titledBooks(books, '   ')).toEqual(books);
  });

  it('keeps only the titles the query matches', () => {
    expect(titledBooks(books, 'yotsu').map((kept) => kept.title)).toEqual(['Yotsuba']);
  });

  it('matches a renamed book by the alias it shows', () => {
    const renamed = [{ ...book('Yotsuba'), alias: 'Clover' }, book('Berserk')];

    expect(titledBooks(renamed, 'clov').map((kept) => kept.title)).toEqual(['Yotsuba']);
    expect(titledBooks(renamed, 'yotsu')).toEqual([]);
  });
});

describe('narrowedBooks', () => {
  const books = [book('Yotsuba'), book('Berserk')];

  it('keeps every book when there is no filter', () => {
    expect(narrowedBooks(books, undefined)).toBe(books);
  });

  it('keeps only the books the filter accepts', () => {
    expect(narrowedBooks(books, (id) => id === 'Berserk').map((kept) => kept.title)).toEqual([
      'Berserk',
    ]);
  });
});

describe('isSearching', () => {
  it('treats a query of spaces as no search', () => {
    expect(isSearching('  ')).toBe(false);
    expect(isSearching(' a ')).toBe(true);
  });
});

describe('matchedText', () => {
  it.each([
    { count: 1, text: '1 title' },
    { count: 0, text: '0 titles' },
    { count: 3, text: '3 titles' },
  ])('counts $count as $text', ({ count, text }) => {
    expect(matchedText(count)).toBe(text);
  });
});

describe('filterKey', () => {
  function press(key: string, held: { isComposing?: boolean; keyCode?: number } = {}) {
    return { key, isComposing: false, keyCode: 0, ...held };
  }

  it('clears the query on Escape while it holds text, even only a space', () => {
    expect(filterKey(press('Escape'), 'yotsuba')).toBe('clear');
    expect(filterKey(press('Escape'), ' ')).toBe('clear');
  });

  it('ignores Escape on an empty query', () => {
    expect(filterKey(press('Escape'), '')).toBe('ignore');
  });

  it('ignores every other key', () => {
    expect([filterKey(press('Enter'), 'yotsuba'), filterKey(press('Enter'), '')]).toEqual([
      'ignore',
      'ignore',
    ]);
  });

  it.each([
    { signal: 'the composing flag that cancels an IME conversion', held: { isComposing: true } },
    { signal: 'the IME process key code 229 that Safari sends', held: { keyCode: 229 } },
  ])('ignores an Escape carrying $signal', ({ held }) => {
    expect(filterKey(press('Escape', held), 'yotsuba')).toBe('ignore');
  });
});

describe('headerFieldKey', () => {
  function press(key: string, held: { isComposing?: boolean; keyCode?: number } = {}) {
    return { key, isComposing: false, keyCode: 0, ...held };
  }

  it('submits on Enter', () => {
    expect(headerFieldKey(press('Enter'), 'moon')).toBe('submit');
  });

  it('clears on Escape while the field holds text', () => {
    expect(headerFieldKey(press('Escape'), 'moon')).toBe('clear');
  });

  it('ignores Escape on an empty field and every other key', () => {
    expect([headerFieldKey(press('Escape'), ''), headerFieldKey(press('a'), 'moon')]).toEqual([
      'ignore',
      'ignore',
    ]);
  });

  it('ignores Enter that confirms an input method composition', () => {
    expect(headerFieldKey(press('Enter', { isComposing: true }), 'つき')).toBe('ignore');
  });
});
