import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { applyEdit } from '../domain/book/book';
import {
  bookForm,
  changedFields,
  formInLanguage,
  languageEdit,
  originalTitleHint,
} from './book-edit-form';

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: bookId('one'),
    title: '月光食堂',
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'double',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 182,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(13)),
    lastReadAt: null,
    finishedAt: null,
    ...overrides,
  };
}

describe('bookForm', () => {
  it('seeds every field from the book', () => {
    const subject = book({ language: 'ko', layoutKind: 'continuous', direction: 'ltr' });

    expect(bookForm(subject)).toEqual({
      title: '月光食堂',
      language: 'ko',
      layoutKind: 'continuous',
      direction: 'ltr',
      pagePairing: 'double',
    });
  });
});

describe('bookForm, for a renamed book', () => {
  it('seeds the title field with the alias', () => {
    expect(bookForm(book({ alias: 'Blame! 1' })).title).toBe('Blame! 1');
  });
});

describe('originalTitleHint', () => {
  it('gives no hint for a book that has no alias', () => {
    expect(originalTitleHint(book())).toBeUndefined();
  });

  it('names the original title of a renamed book', () => {
    expect(originalTitleHint(book({ alias: 'Blame! 1' }))).toBe(
      'Original title: 月光食堂. Clear the field to use it again.',
    );
  });
});

describe('bookForm, for a flow book', () => {
  it('seeds the other fields from the book as usual', () => {
    const subject = book({ layoutKind: 'flow', direction: 'ltr' });

    expect(bookForm(subject)).toEqual({
      title: '月光食堂',
      language: 'ja',
      layoutKind: null,
      direction: 'ltr',
      pagePairing: 'double',
    });
  });
});

describe('formInLanguage', () => {
  const korean = { direction: 'ltr', layoutKind: 'continuous', pagePairing: 'single' } as const;

  it('fills direction, layout and pairing from the new language and keeps the title', () => {
    const form = { ...bookForm(book()), title: 'Moonlight Diner' };

    expect(formInLanguage(form, 'ko', korean)).toEqual({
      title: 'Moonlight Diner',
      language: 'ko',
      layoutKind: 'continuous',
      direction: 'ltr',
      pagePairing: 'single',
    });
  });

  it('leaves a flow book without a layout', () => {
    const form = bookForm(book({ layoutKind: 'flow', sourceKind: 'epub' }));

    expect(formInLanguage(form, 'ko', korean).layoutKind).toBeNull();
  });

  it('saves the filled fields as an edit of the book', () => {
    const subject = book();

    expect(changedFields(subject, formInLanguage(bookForm(subject), 'ko', korean))).toEqual({
      language: 'ko',
      layoutKind: 'continuous',
      direction: 'ltr',
      pagePairing: 'single',
    });
  });
});

describe('languageEdit', () => {
  const korean = { direction: 'ltr', layoutKind: 'continuous', pagePairing: 'single' } as const;

  it("edits an image book's language, direction, layout and pairing at once", () => {
    expect(languageEdit(book(), 'ko', korean)).toEqual({
      language: 'ko',
      layoutKind: 'continuous',
      direction: 'ltr',
      pagePairing: 'single',
    });
  });

  it('leaves a flow book its layout', () => {
    const subject = book({ layoutKind: 'flow', sourceKind: 'epub' });

    expect(languageEdit(subject, 'ko', korean)).toEqual({
      language: 'ko',
      direction: 'ltr',
      pagePairing: 'single',
    });
  });

  it('omits what the new language fills with the value the book already holds', () => {
    const subject = book({ direction: 'ltr' });

    expect(languageEdit(subject, 'ko', { ...korean, layoutKind: 'paged' })).toEqual({
      language: 'ko',
      pagePairing: 'single',
    });
  });
});

describe('changedFields', () => {
  it('leaves a flow book its layout when the form offers none', () => {
    const subject = book({ layoutKind: 'flow' });
    const edit = changedFields(subject, bookForm(subject));

    expect('layoutKind' in edit).toBe(false);
    expect(applyEdit(subject, edit).layoutKind).toBe('flow');
  });

  it('returns an empty edit when nothing moved', () => {
    const subject = book();

    expect(changedFields(subject, bookForm(subject))).toEqual({});
  });

  it('omits an unchanged key rather than repeating its current value', () => {
    const subject = book();
    const edit = changedFields(subject, { ...bookForm(subject), title: 'Blame! 1' });

    expect(edit).toEqual({ alias: 'Blame! 1' });
    expect('language' in edit).toBe(false);
    expect('layoutKind' in edit).toBe(false);
    expect('direction' in edit).toBe(false);
    expect('pagePairing' in edit).toBe(false);
  });

  it('trims a title before comparing it with the current one', () => {
    const subject = book();

    expect(changedFields(subject, { ...bookForm(subject), title: '  月光食堂  ' })).toEqual({});
  });

  it('sends a trimmed rename as the alias and leaves the title alone', () => {
    const subject = book();
    const edit = changedFields(subject, { ...bookForm(subject), title: '  Blame! 1  ' });

    expect(edit).toEqual({ alias: 'Blame! 1' });
    expect(applyEdit(subject, edit)).toMatchObject({ title: '月光食堂', alias: 'Blame! 1' });
  });

  it('sends no alias for an emptied field on a book that has none', () => {
    const subject = book();
    const edit = changedFields(subject, { ...bookForm(subject), title: '   ', language: 'ko' });

    expect(edit).toEqual({ language: 'ko' });
    expect(applyEdit(subject, edit).title).toBe('月光食堂');
  });

  it.each([
    ['an emptied field', '   '],
    ['the original title typed again', '月光食堂'],
  ])('clears the alias for %s', (_, typed) => {
    const subject = book({ alias: 'Blame! 1' });
    const edit = changedFields(subject, { ...bookForm(subject), title: typed });

    expect(edit).toEqual({ alias: null });
    expect(applyEdit(subject, edit)).toMatchObject({ title: '月光食堂', alias: null });
  });

  it('sends nothing when the field still shows the alias', () => {
    const subject = book({ alias: 'Blame! 1' });

    expect(changedFields(subject, bookForm(subject))).toEqual({});
  });

  it('reports every field the user moved', () => {
    const subject = book();
    const edit = changedFields(subject, {
      title: 'Blame! 1',
      language: 'ko',
      layoutKind: 'paged',
      direction: 'ltr',
      pagePairing: 'double',
    });

    expect(edit).toEqual({ alias: 'Blame! 1', language: 'ko', direction: 'ltr' });
  });

  it.each([
    {
      case: 'a pairing the user changed',
      stored: {},
      moved: { pagePairing: 'double-after-cover' },
      edit: { pagePairing: 'double-after-cover' },
    },
    {
      case: 'a pairing the user changed alongside a turn to continuous',
      stored: {},
      moved: { layoutKind: 'continuous', pagePairing: 'double-after-cover' },
      edit: { layoutKind: 'continuous', pagePairing: 'double-after-cover' },
    },
    {
      case: 'direction for a book that is already continuous',
      stored: { layoutKind: 'continuous', direction: 'ltr' },
      moved: { direction: 'rtl' },
      edit: { direction: 'rtl' },
    },
    {
      case: 'direction again when the layout returns to pages',
      stored: { layoutKind: 'continuous', direction: 'ltr' },
      moved: { layoutKind: 'paged', direction: 'rtl' },
      edit: { layoutKind: 'paged', direction: 'rtl' },
    },
  ] as const)('sends $case', ({ stored, moved, edit }) => {
    const subject = book(stored);
    const sent = changedFields(subject, { ...bookForm(subject), ...moved });

    expect(sent).toEqual(edit);
    expect(applyEdit(subject, sent)).toMatchObject(edit);
  });

  it('leaves the direction of a book the user only turned continuous alone', () => {
    const subject = book();
    const edit = changedFields(subject, { ...bookForm(subject), layoutKind: 'continuous' });

    expect(edit).toEqual({ layoutKind: 'continuous' });
    expect(applyEdit(subject, edit).direction).toBe('rtl');
  });
});
