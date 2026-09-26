import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { START_OF_THE_TEXT, imagePlace, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import {
  CONTINUE_LIMIT,
  bookFacts,
  continueReading,
  emptyShelfText,
  otherView,
  readingState,
  shelfBooks,
  shelfTabs,
  sortBooks,
  toShelf,
  viewSwitchName,
} from './library-shelves';

function comic(title: string, page: number, imageCount = 10, addedAt = 0): Book {
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
    addedAt,
    position: imagePlace(imageIndex(page)),
    lastReadAt: null,
    finishedAt: null,
  };
}

function novel(title: string, position: ReadingPlace): Book {
  return {
    ...comic(title, 0),
    layoutKind: 'flow',
    sourceKind: 'epub',
    position,
  };
}

const titles = (books: readonly Book[]): readonly string[] => books.map((book) => book.title);

describe('readingState', () => {
  it('counts a comic on its first page as not started', () => {
    expect(readingState(comic('a', 0))).toBe('unread');
  });

  it('counts a comic past its first page and short of its last as in progress', () => {
    expect(readingState(comic('a', 1))).toBe('reading');
    expect(readingState(comic('a', 8))).toBe('reading');
  });

  it('counts a comic on its last page as finished', () => {
    expect(readingState(comic('a', 9))).toBe('finished');
  });

  it('counts a text never opened past its start as not started', () => {
    expect(readingState(novel('a', START_OF_THE_TEXT))).toBe('unread');
  });

  it('counts a text with a place but no known fraction as in progress', () => {
    expect(readingState(novel('a', textPlace('epubcfi(/6/4!/2)', null)))).toBe('reading');
    expect(readingState(novel('a', textPlace('epubcfi(/6/4!/2)', 0.99)))).toBe('reading');
  });

  it('counts a text read to its end as finished', () => {
    expect(readingState(novel('a', textPlace('epubcfi(/6/40!/4/2)', 1)))).toBe('finished');
  });

  it('counts a book marked finished as finished wherever its place is', () => {
    expect(readingState({ ...comic('a', 0), finishedAt: 5 })).toBe('finished');
    expect(readingState({ ...comic('a', 4), finishedAt: 5 })).toBe('finished');
    expect(readingState({ ...novel('a', START_OF_THE_TEXT), finishedAt: 5 })).toBe('finished');
    expect(readingState({ ...novel('a', textPlace('epubcfi(/6/4!/2)', 0.4)), finishedAt: 5 })).toBe(
      'finished',
    );
  });
});

describe('shelfBooks', () => {
  const books = [comic('fresh', 0), comic('middle', 4), comic('done', 9)];

  it('keeps every book on the all shelf', () => {
    expect(titles(shelfBooks(books, 'all'))).toEqual(['fresh', 'middle', 'done']);
  });

  it('keeps only the books in the state a shelf names', () => {
    expect(titles(shelfBooks(books, 'reading'))).toEqual(['middle']);
    expect(titles(shelfBooks(books, 'unread'))).toEqual(['fresh']);
    expect(titles(shelfBooks(books, 'finished'))).toEqual(['done']);
  });
});

describe('shelfTabs', () => {
  it('labels each shelf with the number of books on it', () => {
    const tabs = shelfTabs([comic('a', 0), comic('b', 3), comic('c', 5)]);

    expect(tabs).toEqual([
      { id: 'all', label: 'All 3' },
      { id: 'reading', label: 'Reading 2' },
      { id: 'unread', label: 'Not started 1' },
      { id: 'finished', label: 'Finished 0' },
    ]);
  });
});

describe('toShelf', () => {
  it('reads a known shelf id', () => {
    expect(toShelf('finished')).toBe('finished');
  });

  it('falls back to the all shelf for an unknown or missing id', () => {
    expect(toShelf('elsewhere')).toBe('all');
    expect(toShelf(undefined)).toBe('all');
  });
});

describe('sortBooks', () => {
  const books = [comic('Vol 10', 1, 10, 3), comic('vol 2', 9, 10, 2), comic('Akira', 4, 10, 1)];

  it('keeps the order it was given for recently added', () => {
    expect(sortBooks(books, 'added')).toBe(books);
  });

  it('orders titles alphabetically, ignoring case and reading numbers as numbers', () => {
    expect(titles(sortBooks(books, 'title'))).toEqual(['Akira', 'vol 2', 'Vol 10']);
  });

  it('puts the book read furthest first', () => {
    expect(titles(sortBooks(books, 'progress'))).toEqual(['vol 2', 'Akira', 'Vol 10']);
  });

  it('counts a book marked finished as read through', () => {
    const marked = [comic('almost', 8), { ...comic('marked', 2), finishedAt: 5 }];

    expect(titles(sortBooks(marked, 'progress'))).toEqual(['marked', 'almost']);
  });

  it('leaves the given list unchanged', () => {
    sortBooks(books, 'title');

    expect(titles(books)).toEqual(['Vol 10', 'vol 2', 'Akira']);
  });
});

describe('continueReading', () => {
  it('offers only the books in progress, keeping the given order among equals', () => {
    const books = [comic('fresh', 0), comic('one', 2), comic('done', 9), comic('two', 5)];

    expect(titles(continueReading(books))).toEqual(['one', 'two']);
  });

  it('offers no more than the limit', () => {
    const books = Array.from({ length: CONTINUE_LIMIT + 2 }, (_, at) => comic(`b${at}`, 3));

    expect(continueReading(books)).toHaveLength(CONTINUE_LIMIT);
  });

  it('leaves out a book marked finished even when it is read again', () => {
    const books = [{ ...comic('marked', 4), lastReadAt: 300, finishedAt: 100 }, comic('open', 4)];

    expect(titles(continueReading(books))).toEqual(['open']);
  });

  it('puts the book read most recently first', () => {
    const books = [
      { ...comic('earlier', 2), lastReadAt: 100 },
      { ...comic('latest', 2), lastReadAt: 300 },
      { ...comic('between', 2), lastReadAt: 200 },
    ];

    expect(titles(continueReading(books))).toEqual(['latest', 'between', 'earlier']);
  });

  it('places a book never read by the time it was added', () => {
    const books = [
      { ...comic('read', 2, 10, 50), lastReadAt: 200 },
      comic('added later', 2, 10, 300),
      comic('added earlier', 2, 10, 100),
    ];

    expect(titles(continueReading(books))).toEqual(['added later', 'read', 'added earlier']);
  });

  it('orders the whole shelf before it applies the limit', () => {
    const books = [
      ...Array.from({ length: CONTINUE_LIMIT }, (_, at) => ({
        ...comic(`b${at}`, 3),
        lastReadAt: at + 1,
      })),
      { ...comic('latest', 3), lastReadAt: 1000 },
    ];

    expect(titles(continueReading(books))[0]).toBe('latest');
  });
});

describe('bookFacts', () => {
  it('names the source, the reading direction and the image count', () => {
    expect(bookFacts(comic('a', 0, 120))).toBe('Archive · Right to left · 120 images');
  });

  it('reads a strip from top to bottom whatever direction it stores', () => {
    const strip = { ...comic('a', 0, 1), layoutKind: 'continuous', sourceKind: 'images' } as const;

    expect(bookFacts(strip)).toBe('Images · Top to bottom · 1 image');
  });

  it('describes an EPUB as flowing text', () => {
    const book = { ...novel('a', START_OF_THE_TEXT), direction: 'ltr' } as const;

    expect(bookFacts(book)).toBe('EPUB · Left to right · Flowing text');
  });

  it('names a PDF', () => {
    expect(bookFacts({ ...comic('a', 0, 2), sourceKind: 'pdf' })).toBe(
      'PDF · Right to left · 2 images',
    );
  });
});

describe('emptyShelfText', () => {
  it('reports a search that matched nothing on the shelf', () => {
    expect(emptyShelfText('reading', true)).toBe('No title on this shelf matches.');
  });

  it('explains an empty shelf when nothing is searched', () => {
    expect(emptyShelfText('reading', false)).toBe('Nothing in progress. Open a book to start it.');
    expect(emptyShelfText('finished', false)).toBe('No finished books yet.');
  });
});

describe('otherView', () => {
  it('switches covers to a list and a list back to covers', () => {
    expect([otherView('grid'), otherView('list')]).toEqual(['list', 'grid']);
  });
});

describe('viewSwitchName', () => {
  it('names the view the switch leads to, not the one on screen', () => {
    expect([viewSwitchName('grid'), viewSwitchName('list')]).toEqual([
      'Show as list',
      'Show as covers',
    ]);
  });
});
