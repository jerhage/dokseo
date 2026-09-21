import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import type { BookMatches, SearchedBook } from './capture-results';
import { matchedTagIds, quickFinds } from './quick-find';
import type { Tag } from '../tag/tag';

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
    bookId: book.id,
    regions: [{ index: imageIndex(place.index), rect: imageRect(place.x, 0, 100, 60) }],
    text,
    tagIds: tags,
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
  it('finds nothing for a blank query', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '',
      'everything',
    );

    expect(found.captures).toEqual([]);
    expect(found.books).toEqual([]);
  });

  it('finds nothing for a whitespace-only query', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '   ',
      'everything',
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
    );

    expect(texts(found.captures)).toEqual(['山の音']);
  });

  it('orders the captures of a book along its reading direction', () => {
    const found = quickFinds(
      [
        capture(ONE, '海 left', [], { index: 0, x: 0 }),
        capture(ONE, '海 later page', [], { index: 1, x: 400 }),
        capture(ONE, '海 right', [], { index: 0, x: 400 }),
      ],
      BOOKS,
      [],
      '海',
      'everything',
    );

    expect(texts(found.captures)).toEqual(['海 right', '海 left', '海 later page']);
  });

  it('drops a book that holds nothing the query found', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', []), capture(TWO, '山の音', [])],
      BOOKS,
      [],
      '海',
      'everything',
    );

    expect(found.captures.map((book) => book.book.id)).toEqual([ONE.id]);
  });

  it('matches a tag name through the fold, so case and width do not matter', () => {
    const found = quickFinds(
      [capture(ONE, '山', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, 'ｼｰ-Imagery')],
      'シー-imagery',
      'tags',
    );

    expect(texts(found.captures)).toEqual(['山']);
  });

  it('finds a book whose title matches, in the order it was given', () => {
    const found = quickFinds([], BOOKS, [], 'volume', 'everything');

    expect(titles(found.books)).toEqual(['Volume one', 'Volume two']);
  });

  it('finds a book by its title although no capture holds that text', () => {
    const found = quickFinds(
      [capture(ONE, '海の音', []), capture(TWO, '山の音', [])],
      BOOKS,
      [],
      'volume two',
      'everything',
    );

    expect(titles(found.books)).toEqual(['Volume two']);
    expect(found.captures).toEqual([]);
  });

  it('leaves the captures of a title match out of the results', () => {
    const found = quickFinds([capture(TWO, '海の音', [])], BOOKS, [], 'volume two', 'everything');

    expect(titles(found.books)).toEqual(['Volume two']);
    expect(texts(found.captures)).toEqual([]);
  });

  it('finds no book under the tags filter', () => {
    const found = quickFinds(
      [capture(ONE, '山', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, 'volume-imagery')],
      'volume',
      'tags',
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

    const found = quickFinds([], [wide], [], 'シー-volume three', 'everything');

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
