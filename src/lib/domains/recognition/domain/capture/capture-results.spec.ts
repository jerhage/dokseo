import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { at } from '$lib/shared/testing/at';
import { captureHolds, matchesByBook, matchTally, taggedByBook } from './capture-results';
import type { SearchedBook } from './capture-results';

type Found = {
  readonly name: string;
  readonly bookId: BookId;
  readonly regions: readonly ImageRegion[];
  readonly text: string;
};

function book(id: string, direction: ReadingDirection = 'rtl'): SearchedBook {
  return { id: bookId(id), title: `Book ${id}`, language: 'ja', direction };
}

function capture(name: string, id: string, text: string, index = 0, x = 0, y = 0): Found {
  return {
    name,
    bookId: bookId(id),
    regions: [{ index: imageIndex(index), rect: imageRect(x, y, 100, 60) }],
    text,
  };
}

function names(matched: readonly { readonly captures: readonly Found[] }[]): readonly string[][] {
  return matched.map((one) => one.captures.map((found) => found.name));
}

const SFX: TagId = tagId('sfx');

const KEIGO: TagId = tagId('keigo');

type Held = Found & { readonly tagIds: readonly TagId[] };

function held(name: string, id: string, tags: readonly TagId[], index = 0, x = 0, y = 0): Held {
  return { ...capture(name, id, 'text', index, x, y), tagIds: tags };
}

function heldNames(tagged: readonly { readonly captures: readonly Held[] }[]): readonly string[][] {
  return tagged.map((one) => one.captures.map((found) => found.name));
}

describe('captureHolds', () => {
  it('matches a capture whose text holds the query', () => {
    expect(captureHolds(capture('only', 'one', '海が見える'), '海')).toBe(true);
  });

  it('rejects a capture whose text does not hold the query', () => {
    expect(captureHolds(capture('only', 'one', '海が見える'), 'ラーメン')).toBe(false);
  });

  it('matches through the fold, by case and by character width', () => {
    expect(captureHolds(capture('cased', 'one', 'Coffee'), 'coffee')).toBe(true);
    expect(captureHolds(capture('narrow', 'one', 'ｺｰﾋｰ'), 'コーヒー')).toBe(true);
  });

  it('rejects a blank query', () => {
    expect(captureHolds(capture('only', 'one', '海が見える'), '')).toBe(false);
  });

  it('rejects a query that is only spaces', () => {
    expect(captureHolds(capture('only', 'one', '海が見える'), '   ')).toBe(false);
  });
});

describe('matchesByBook', () => {
  it('groups the captures that match under the book each was taken from', () => {
    const matched = matchesByBook(
      [
        capture('first', 'one', '海が見える'),
        capture('second', 'two', '海の音'),
        capture('third', 'one', '海へ行く', 1),
      ],
      [book('one'), book('two')],
      '海',
    );

    expect(matched.map((one) => one.book.id)).toEqual([bookId('one'), bookId('two')]);
    expect(names(matched)).toEqual([['first', 'third'], ['second']]);
  });

  it('keeps the books in the order they were given', () => {
    const matched = matchesByBook(
      [capture('later', 'two', '海'), capture('earlier', 'one', '海')],
      [book('two'), book('one')],
      '海',
    );

    expect(matched.map((one) => one.book.id)).toEqual([bookId('two'), bookId('one')]);
  });

  it('orders the captures inside each book the way that book reads', () => {
    const matched = matchesByBook(
      [
        capture('left', 'one', '海', 0, 20, 100),
        capture('right', 'one', '海', 0, 600, 100),
        capture('top', 'two', '海', 0, 600, 100),
        capture('bottom', 'two', '海', 0, 20, 900),
      ],
      [book('one', 'rtl'), book('two', 'ltr')],
      '海',
    );

    expect(names(matched)).toEqual([
      ['right', 'left'],
      ['top', 'bottom'],
    ]);
  });

  it('orders the captures of one book by image index before position on the page', () => {
    const matched = matchesByBook(
      [capture('later', 'one', '海', 4, 900, 0), capture('earlier', 'one', '海', 1, 0, 900)],
      [book('one')],
      '海',
    );

    expect(names(matched)).toEqual([['earlier', 'later']]);
  });

  it('folds width and kana across books, like the panel does', () => {
    const matched = matchesByBook(
      [capture('half', 'one', 'ｺｰﾋｰ'), capture('full', 'two', 'コーヒー')],
      [book('one'), book('two')],
      'こーひー',
    );

    expect(names(matched)).toEqual([['half'], ['full']]);
  });

  it('reports nothing when no capture holds the text', () => {
    const matched = matchesByBook(
      [capture('only', 'one', '海が見える')],
      [book('one')],
      'ラーメン',
    );

    expect(matched).toEqual([]);
    expect(matchTally(matched)).toBe(0);
  });

  it('reports nothing for a query that is only spaces', () => {
    expect(matchesByBook([capture('only', 'one', '海')], [book('one')], '   ')).toEqual([]);
  });

  it('drops a match whose book has since been deleted', () => {
    const matched = matchesByBook(
      [capture('living', 'one', '海'), capture('orphan', 'gone', '海')],
      [book('one')],
      '海',
    );

    expect(names(matched)).toEqual([['living']]);
    expect(matchTally(matched)).toBe(1);
  });

  it('reports nothing when every match belongs to a deleted book', () => {
    expect(matchesByBook([capture('orphan', 'gone', '海')], [book('one')], '海')).toEqual([]);
  });

  it('leaves out a book holding no match', () => {
    const matched = matchesByBook([capture('only', 'one', '海')], [book('one'), book('two')], '海');

    expect(matched).toHaveLength(1);
    expect(at(matched, 0).book.id).toBe(bookId('one'));
  });

  it('counts every match across every book', () => {
    const matched = matchesByBook(
      [capture('a', 'one', '海'), capture('b', 'one', '海'), capture('c', 'two', '海')],
      [book('one'), book('two')],
      '海',
    );

    expect(matchTally(matched)).toBe(3);
  });

  it('counts a capture once however many ways it holds the query', () => {
    const many = { ...capture('many', 'one', '海から海へ'), note: '海の音' };
    const matched = matchesByBook([many], [book('one')], '海');

    expect(names(matched)).toEqual([['many']]);
    expect(matchTally(matched)).toBe(1);
  });

  it('leaves the captures it was given untouched', () => {
    const given = [capture('later', 'one', '海', 4), capture('earlier', 'one', '海', 1)];
    matchesByBook(given, [book('one')], '海');

    expect(given.map((one) => one.name)).toEqual(['later', 'earlier']);
  });
});

describe('taggedByBook', () => {
  it('groups the captures carrying the tag under the book each was taken from', () => {
    const tagged = taggedByBook(
      [
        held('first', 'one', [SFX]),
        held('second', 'two', [SFX]),
        held('third', 'one', [SFX], 1),
        held('other', 'one', [KEIGO], 2),
      ],
      [book('one'), book('two')],
      SFX,
    );

    expect(tagged.map((one) => one.book.id)).toEqual([bookId('one'), bookId('two')]);
    expect(heldNames(tagged)).toEqual([['first', 'third'], ['second']]);
  });

  it('orders a right-to-left book from the right of the page', () => {
    const tagged = taggedByBook(
      [held('left', 'one', [SFX], 0, 20, 100), held('right', 'one', [SFX], 0, 600, 100)],
      [book('one', 'rtl')],
      SFX,
    );

    expect(heldNames(tagged)).toEqual([['right', 'left']]);
  });

  it('orders a left-to-right book down the page', () => {
    const tagged = taggedByBook(
      [held('bottom', 'one', [SFX], 0, 20, 900), held('top', 'one', [SFX], 0, 600, 100)],
      [book('one', 'ltr')],
      SFX,
    );

    expect(heldNames(tagged)).toEqual([['top', 'bottom']]);
  });

  it('orders the captures of one book by image index before position on the page', () => {
    const tagged = taggedByBook(
      [held('later', 'one', [SFX], 4, 900, 0), held('earlier', 'one', [SFX], 1, 0, 900)],
      [book('one')],
      SFX,
    );

    expect(heldNames(tagged)).toEqual([['earlier', 'later']]);
  });

  it('leaves out a book whose captures carry no such tag', () => {
    const tagged = taggedByBook(
      [held('only', 'one', [SFX]), held('elsewhere', 'two', [KEIGO])],
      [book('one'), book('two')],
      SFX,
    );

    expect(tagged).toHaveLength(1);
    expect(at(tagged, 0).book.id).toBe(bookId('one'));
  });

  it('reports nothing for a tag no capture carries', () => {
    expect(taggedByBook([held('only', 'one', [SFX])], [book('one')], KEIGO)).toEqual([]);
  });

  it('drops a capture whose book has since been deleted', () => {
    const tagged = taggedByBook(
      [held('living', 'one', [SFX]), held('orphan', 'gone', [SFX])],
      [book('one')],
      SFX,
    );

    expect(heldNames(tagged)).toEqual([['living']]);
    expect(matchTally(tagged)).toBe(1);
  });

  it('leaves the captures it was given untouched', () => {
    const given = [held('later', 'one', [SFX], 4), held('earlier', 'one', [SFX], 1)];
    taggedByBook(given, [book('one')], SFX);

    expect(given.map((one) => one.name)).toEqual(['later', 'earlier']);
  });
});
