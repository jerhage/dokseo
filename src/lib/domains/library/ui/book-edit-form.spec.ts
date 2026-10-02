import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { applyEdit } from '../domain/book/book';
import { bookForm, changedFields } from './book-edit-form';

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: bookId('one'),
    title: '月光食堂',
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

    expect(edit).toEqual({ title: 'Blame! 1' });
    expect('language' in edit).toBe(false);
    expect('layoutKind' in edit).toBe(false);
    expect('direction' in edit).toBe(false);
    expect('pagePairing' in edit).toBe(false);
  });

  it('trims a title before comparing it with the current one', () => {
    const subject = book();

    expect(changedFields(subject, { ...bookForm(subject), title: '  月光食堂  ' })).toEqual({});
  });

  it('trims a title it does send', () => {
    const subject = book();

    expect(changedFields(subject, { ...bookForm(subject), title: '  Blame! 1  ' })).toEqual({
      title: 'Blame! 1',
    });
  });

  it('drops an emptied title instead of sending one the domain would reject', () => {
    const subject = book();
    const edit = changedFields(subject, { ...bookForm(subject), title: '   ', language: 'ko' });

    expect(edit).toEqual({ language: 'ko' });
    expect('title' in edit).toBe(false);
    expect(applyEdit(subject, edit).title).toBe('月光食堂');
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

    expect(edit).toEqual({ title: 'Blame! 1', language: 'ko', direction: 'ltr' });
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
