import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import type { SearchedBook } from '../capture/capture-results';
import { paletteFinds, paletteTally } from './tag-find';
import type { Tag } from './tag';

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

function tag(id: TagId, name: string): Tag {
  return { id, name, colour: 'slate', createdAt: 0 };
}

function capture(book: SearchedBook, text: string, tags: readonly TagId[]) {
  return {
    bookId: book.id,
    regions: [{ index: imageIndex(0), rect: imageRect(0, 0, 100, 60) }],
    text,
    tagIds: tags,
    createdAt: 0,
  };
}

describe('paletteFinds', () => {
  it('finds nothing for a blank query', () => {
    const finds = paletteFinds(
      [capture(ONE, '海の音', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '',
      'everything',
    );

    expect(finds).toEqual({ tags: [], captures: [] });
  });

  it('finds nothing for a whitespace-only query', () => {
    const finds = paletteFinds(
      [capture(ONE, '海の音', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '   ',
      'everything',
    );

    expect(finds).toEqual({ tags: [], captures: [] });
  });

  it('names a tag whose own name matches the query', () => {
    const finds = paletteFinds(
      [capture(ONE, '山', [IMAGERY]), capture(TWO, '川', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '海',
      'everything',
    );

    expect(at(finds.tags, 0)).toEqual({
      kind: 'named',
      tag: tag(IMAGERY, '海-imagery'),
      captures: 2,
      documents: 2,
    });
  });

  it('counts a named tag over the whole scope, not over the matching captures', () => {
    const finds = paletteFinds(
      [
        capture(ONE, '海の音', [IMAGERY]),
        capture(ONE, '山の音', [IMAGERY]),
        capture(TWO, '川の音', [IMAGERY]),
      ],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '海',
      'everything',
    );

    expect(at(finds.tags, 0)).toMatchObject({ kind: 'named', captures: 3, documents: 2 });
    expect(paletteTally(finds).captures).toBe(1);
  });

  it('carries a tag worn by a matching capture but not named by the query', () => {
    const finds = paletteFinds(
      [
        capture(ONE, '海の音', [FAVOURITE]),
        capture(ONE, '海の色', [FAVOURITE]),
        capture(TWO, '山の音', [FAVOURITE]),
      ],
      BOOKS,
      [tag(FAVOURITE, 'favourite-lines')],
      '海',
      'everything',
    );

    expect(at(finds.tags, 0)).toEqual({
      kind: 'carried',
      tag: tag(FAVOURITE, 'favourite-lines'),
      here: 2,
      total: 3,
    });
  });

  it('names a tag once when its name matches and a matching capture carries it', () => {
    const finds = paletteFinds(
      [capture(ONE, '海の音', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, '海-imagery')],
      '海',
      'everything',
    );

    expect(finds.tags).toHaveLength(1);
    expect(at(finds.tags, 0).kind).toBe('named');
  });

  it('omits a tag carried only by captures the query did not match', () => {
    const finds = paletteFinds(
      [capture(ONE, '海の音', [FAVOURITE]), capture(ONE, '山の音', [KEIGO])],
      BOOKS,
      [tag(FAVOURITE, 'favourite-lines'), tag(KEIGO, 'keigo')],
      '海',
      'everything',
    );

    expect(finds.tags.map((row) => row.tag.id)).toEqual([FAVOURITE]);
  });

  it('orders every named row before every carried row', () => {
    const finds = paletteFinds(
      [
        capture(ONE, '海の音', [FAVOURITE]),
        capture(ONE, '海の色', [FAVOURITE]),
        capture(ONE, '海の底', [FAVOURITE]),
        capture(TWO, '山', [IMAGERY]),
      ],
      BOOKS,
      [tag(FAVOURITE, 'favourite-lines'), tag(IMAGERY, '海-imagery')],
      '海',
      'everything',
    );

    expect(finds.tags.map((row) => row.kind)).toEqual(['named', 'carried']);
    expect(at(finds.tags, 0)).toMatchObject({ captures: 1 });
    expect(at(finds.tags, 1)).toMatchObject({ here: 3 });
  });

  it('orders each group by count descending and then by name', () => {
    const quiet = tagId('quiet');
    const loud = tagId('loud');
    const finds = paletteFinds(
      [
        capture(ONE, '海 one', [loud, KEIGO]),
        capture(ONE, '海 two', [loud, quiet]),
        capture(ONE, '海 three', [KEIGO]),
      ],
      BOOKS,
      [tag(quiet, 'a-quiet'), tag(loud, 'z-loud'), tag(KEIGO, 'b-keigo')],
      '海',
      'everything',
    );

    expect(finds.tags.map((row) => row.tag.name)).toEqual(['b-keigo', 'z-loud', 'a-quiet']);
  });

  it('orders two named rows of equal count by name', () => {
    const finds = paletteFinds(
      [capture(ONE, '山', [IMAGERY]), capture(ONE, '川', [FAVOURITE])],
      BOOKS,
      [tag(IMAGERY, '海-zebra'), tag(FAVOURITE, '海-apple')],
      '海',
      'everything',
    );

    expect(finds.tags.map((row) => row.tag.name)).toEqual(['海-apple', '海-zebra']);
  });

  it('drops the captures and every carried row under the tags filter', () => {
    const finds = paletteFinds(
      [capture(ONE, '海の音', [FAVOURITE, IMAGERY])],
      BOOKS,
      [tag(FAVOURITE, 'favourite-lines'), tag(IMAGERY, '海-imagery')],
      '海',
      'tags',
    );

    expect(finds.captures).toEqual([]);
    expect(finds.tags.map((row) => row.tag.id)).toEqual([IMAGERY]);
  });

  it('matches a tag name through the fold, so width and case do not matter', () => {
    const finds = paletteFinds(
      [capture(ONE, '山', [IMAGERY])],
      BOOKS,
      [tag(IMAGERY, 'ｼｰ-Imagery')],
      'シー-imagery',
      'tags',
    );

    expect(at(finds.tags, 0).kind).toBe('named');
  });
});

describe('paletteTally', () => {
  it('counts the tag rows and the matching captures across every book', () => {
    const finds = paletteFinds(
      [capture(ONE, '海の音', [FAVOURITE]), capture(TWO, '海の色', [IMAGERY])],
      BOOKS,
      [tag(FAVOURITE, 'favourite-lines'), tag(IMAGERY, '海-imagery')],
      '海',
      'everything',
    );

    expect(paletteTally(finds)).toEqual({ tags: 2, captures: 2 });
  });

  it('counts nothing for a query that found nothing', () => {
    expect(paletteTally({ tags: [], captures: [] })).toEqual({ tags: 0, captures: 0 });
  });
});
