import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import {
  clearsSearch,
  filterKey,
  formatBytes,
  isSearching,
  libraryBody,
  librarySummary,
  matchedText,
  showsFilter,
  storageText,
  titledBooks,
} from './library-overview';

function book(title: string, imageCount = 10): Book {
  return {
    id: bookId(title),
    title,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    imageCount,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
  };
}

describe('formatBytes', () => {
  it('writes bytes below a kilobyte whole', () => {
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('moves to the next unit at exactly 1024', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('keeps one decimal below ten of a larger unit', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('drops the decimal from ten of a unit upwards', () => {
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
  });

  it('stops at terabytes', () => {
    expect(formatBytes(2048 * 1024 ** 4)).toBe('2048 TB');
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
});

describe('isSearching', () => {
  it('treats a query of spaces as no search', () => {
    expect(isSearching('  ')).toBe(false);
    expect(isSearching(' a ')).toBe(true);
  });
});

describe('matchedText', () => {
  it('counts one title in the singular', () => {
    expect(matchedText(1)).toBe('1 title');
  });

  it('counts other numbers in the plural', () => {
    expect(matchedText(0)).toBe('0 titles');
    expect(matchedText(3)).toBe('3 titles');
  });
});

describe('clearsSearch', () => {
  it('clears on Escape while the query holds text', () => {
    expect(clearsSearch('Escape', ' ')).toBe(true);
  });

  it('leaves Escape alone once the query is empty', () => {
    expect(clearsSearch('Escape', '')).toBe(false);
  });

  it('ignores every other key', () => {
    expect(clearsSearch('Enter', 'yotsuba')).toBe(false);
  });
});

describe('showsFilter', () => {
  it('shows the filter once it is opened', () => {
    expect(showsFilter(true, '')).toBe(true);
  });

  it('shows the filter while a query narrows the titles, even when it was never opened', () => {
    expect(showsFilter(false, 'yotsuba')).toBe(true);
  });

  it('hides the filter when it is closed and the query is empty or blank', () => {
    expect([showsFilter(false, ''), showsFilter(false, '  ')]).toEqual([false, false]);
  });
});

describe('filterKey', () => {
  it('clears the query on Escape while it holds text, whether or not the filter can close', () => {
    expect([filterKey('Escape', 'yotsuba', true), filterKey('Escape', 'yotsuba', false)]).toEqual([
      'clear',
      'clear',
    ]);
  });

  it('closes a closable filter on Escape once the query is empty', () => {
    expect(filterKey('Escape', '', true)).toBe('close');
  });

  it('ignores Escape on an empty filter that cannot close', () => {
    expect(filterKey('Escape', '', false)).toBe('ignore');
  });

  it('ignores every other key', () => {
    expect([filterKey('Enter', 'yotsuba', true), filterKey('Enter', '', true)]).toEqual([
      'ignore',
      'ignore',
    ]);
  });
});

describe('libraryBody', () => {
  it('reads the library while it settles with nothing to show', () => {
    expect(libraryBody('idle', 0, false)).toBe('reading');
    expect(libraryBody('loading', 0, false)).toBe('reading');
  });

  it('lists what it already holds while a reload settles', () => {
    expect(libraryBody('loading', 2, false)).toBe('listed');
    expect(libraryBody('loading', 0, true)).toBe('listed');
  });

  it('reports a failed read even with books on screen', () => {
    expect(libraryBody('failed', 0, false)).toBe('failed');
    expect(libraryBody('failed', 3, false)).toBe('failed');
  });

  it('invites a first upload when the ready library is empty', () => {
    expect(libraryBody('ready', 0, false)).toBe('empty');
  });

  it('lists a ready library that holds books or an import', () => {
    expect(libraryBody('ready', 1, false)).toBe('listed');
    expect(libraryBody('ready', 0, true)).toBe('listed');
  });
});
