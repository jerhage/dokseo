import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import type { BookMatches, SearchedBook } from './capture-results';
import { matchedTagIds, quickFinds } from './quick-find';
import type { Tag } from '../tag/tag';

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

const IMAGERY: TagId = tagId('imagery');

const FAVOURITE: TagId = tagId('favourite');

const KEIGO: TagId = tagId('keigo');

const ONE: SearchedBook = {
  id: bookId('one'),
  title: 'Volume one',
  language: 'ja',
  direction: 'rtl',
};

const TWO: SearchedBook = {
  id: bookId('two'),
  title: 'Volume two',
  language: 'ja',
  direction: 'rtl',
};

const BOOKS: readonly SearchedBook[] = [ONE, TWO];

type Place = { readonly index: number; readonly x: number };

const FIRST: Place = { index: 0, x: 0 };

function tag(id: TagId, name: string): Tag {
  return { id, name, colour: 'slate', createdAt: 0 };
}

function capture(book: SearchedBook, text: string, tags: readonly TagId[], place: Place = FIRST) {
  return {
    origin: 'written' as const,
    bookId: book.id,
    anchor: regionAnchor([
      { index: imageIndex(place.index), rect: imageRect(place.x, 0, 100, 60) },
    ]),
    text,
    tagIds: tags,
    createdAt: 0,
  };
}

const PASSAGE_ORDER = ['/6/4!/2:0', '/6/14!/2:0', '/6/22!/2:0'];

function byPassageOrder(earlier: string, later: string): number {
  return PASSAGE_ORDER.indexOf(earlier) - PASSAGE_ORDER.indexOf(later);
}

function lifted(book: SearchedBook, text: string, cfi: string) {
  return {
    origin: 'lifted' as const,
    bookId: book.id,
    anchor: textAnchor(cfi, { exact: text, prefix: '', suffix: '' }, null),
    text,
    note: null,
    tagIds: [],
    createdAt: 0,
  };
}

function texts<T extends { readonly text: string }>(
  found: readonly BookMatches<T>[],
): readonly string[] {
  return found.flatMap((book) => book.captures.map((held) => held.text));
}

function titles(found: readonly SearchedBook[]): readonly string[] {
  return found.map((book) => book.title);
}

describe('quickFinds', () => {
  it('orders the lifted captures inside a book by the passage order it is given', () => {
    const found = quickFinds(
      [
        lifted(ONE, '海の匂い', '/6/22!/2:0'),
        lifted(ONE, '海が見える', '/6/4!/2:0'),
        lifted(ONE, '海まであと少し', '/6/14!/2:0'),
      ],
      BOOKS,
      [],
      '海',
      'everything',
      byPassageOrder,
    );

    expect(texts(found.captures)).toEqual(['海が見える', '海まであと少し', '海の匂い']);
  });

  it.each([
    ['blank', ''],
    ['whitespace-only', '   '],
  ])('finds nothing for a %s query', (_, query) => {
    const found = quickFinds(
      [capture(ONE, '海の音', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      query,
      'everything',
      byCfi,
    );

    expect(found.captures).toEqual([]);
    expect(found.books).toEqual([]);
  });

  it('finds a capture whose text matches', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', []), capture(ONE, '山の音', [])],
      BOOKS,
      [],
      '海',
      'everything',
      byCfi,
    );

    expect(texts(found.captures)).toEqual(['海の音']);
    expect(at(found.captures, 0).book).toEqual(ONE);
  });

  it('finds a capture whose tag name matches although its text does not', () => {
    const found = quickFinds(
      [capture(ONE, '山の音', [IMAGERY]), capture(ONE, '川の音', [KEIGO])],
      BOOKS,
      [tag(IMAGERY, '海-imagery'), tag(KEIGO, 'keigo')],
      '海',
      'everything',
      byCfi,
    );

    expect(texts(found.captures)).toEqual(['山の音']);
  });

  it('lists a capture found by both its text and its tag once', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '海',
      'everything',
      byCfi,
    );

    expect(texts(found.captures)).toEqual(['海の音']);
  });

  it('excludes a text-only match under the tags filter', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', [FAVOURITE]), capture(ONE, '山の音', [IMAGERY])],
      BOOKS,
      [tag(FAVOURITE, 'favourite-lines'), tag(IMAGERY, '海-imagery')],
      '海',
      'tags',
      byCfi,
    );

    expect(texts(found.captures)).toEqual(['山の音']);
  });

  it('matches a tag name through the fold, so case and width do not matter', () => {
    const found = quickFinds(
      [capture(ONE, '山', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, 'ｼｰ-Imagery')],
      'シー-imagery',
      'tags',
      byCfi,
    );

    expect(texts(found.captures)).toEqual(['山']);
  });

  it('finds a book whose title matches, in the order it was given', () => {
    const found = quickFinds([], BOOKS, [], 'volume', 'everything', byCfi);

    expect(titles(found.books)).toEqual(['Volume one', 'Volume two']);
  });

  it('finds a book by its title although no capture holds that text, and leaves the captures of that book out of the results', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', []), capture(TWO, '山の音', []), capture(TWO, '海の音', [])],
      BOOKS,
      [],
      'volume two',
      'everything',
      byCfi,
    );

    expect(titles(found.books)).toEqual(['Volume two']);
    expect(found.captures).toEqual([]);
  });

  it('finds no capture of a book the shelf no longer holds, by its text or its tag', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', []), capture(TWO, '海の色', [IMAGERY])],
      [ONE],
      [tag(IMAGERY, 'imagery')],
      '海',
      'everything',
      byCfi,
    );
    const byTag = quickFinds(
      [capture(TWO, '山', [IMAGERY])],
      [ONE],
      [tag(IMAGERY, 'imagery')],
      'imagery',
      'tags',
      byCfi,
    );

    expect(texts(found.captures)).toEqual(['海の音']);
    expect(byTag.captures).toEqual([]);
  });

  it('finds no book under the tags filter', () => {
    const found = quickFinds(
      [capture(ONE, '山', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, 'volume-imagery')],
      'volume',
      'tags',
      byCfi,
    );

    expect(found.books).toEqual([]);
    expect(texts(found.captures)).toEqual(['山']);
  });

  it('matches a title through the fold, so case and width do not matter', () => {
    const wide: SearchedBook = {
      id: bookId('wide'),
      title: 'ｼｰ-Volume Ｔｈｒｅｅ',
      language: 'ko',
      direction: 'ltr',
    };

    const found = quickFinds([], [wide], [], 'シー-volume three', 'everything', byCfi);

    expect(titles(found.books)).toEqual(['ｼｰ-Volume Ｔｈｒｅｅ']);
  });
});

describe('matchedTagIds', () => {
  it('reports the carried tags whose names match the query', () => {
    const matched = matchedTagIds(
      capture(ONE, '山', [FAVOURITE, IMAGERY]),
      [tag(FAVOURITE, 'favourite-lines'), tag(IMAGERY, '海-imagery'), tag(KEIGO, '海-keigo')],
      '海',
    );

    expect(matched).toEqual([IMAGERY]);
  });

  it('reports nothing for a blank query', () => {
    const matched = matchedTagIds(
      capture(ONE, '山', [IMAGERY]),
      [tag(IMAGERY, '海-imagery')],
      '  ',
    );

    expect(matched).toEqual([]);
  });
});
