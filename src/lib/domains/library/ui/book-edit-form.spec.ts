import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import type { Book } from '../domain/book';
import { applyEdit } from '../domain/book';
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
    imageCount: 182,
    addedAt: 1758240000000,
    position: imageIndex(13),
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

describe('changedFields', () => {
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

  it('sends a pairing the user changed', () => {
    const subject = book();
    const edit = changedFields(subject, {
      ...bookForm(subject),
      pagePairing: 'double-after-cover',
    });

    expect(edit).toEqual({ pagePairing: 'double-after-cover' });
    expect(applyEdit(subject, edit).pagePairing).toBe('double-after-cover');
  });

  it('omits a pairing the user left alone', () => {
    const subject = book();
    const edit = changedFields(subject, { ...bookForm(subject), title: 'Blame! 1' });

    expect(edit).toEqual({ title: 'Blame! 1' });
    expect('pagePairing' in edit).toBe(false);
  });

  it('sends a pairing the user changed alongside a turn to continuous', () => {
    const subject = book();
    const edit = changedFields(subject, {
      ...bookForm(subject),
      layoutKind: 'continuous',
      pagePairing: 'double-after-cover',
    });

    expect(edit).toEqual({ layoutKind: 'continuous', pagePairing: 'double-after-cover' });
    expect(applyEdit(subject, edit).pagePairing).toBe('double-after-cover');
  });

  it('leaves the direction of a book the user only turned continuous alone', () => {
    const subject = book();
    const edit = changedFields(subject, { ...bookForm(subject), layoutKind: 'continuous' });

    expect(edit).toEqual({ layoutKind: 'continuous' });
    expect(applyEdit(subject, edit).direction).toBe('rtl');
  });

  it('sends direction for a book that is already continuous', () => {
    const subject = book({ layoutKind: 'continuous', direction: 'ltr' });
    const edit = changedFields(subject, { ...bookForm(subject), direction: 'rtl' });

    expect(edit).toEqual({ direction: 'rtl' });
    expect(applyEdit(subject, edit).direction).toBe('rtl');
  });

  it('returns a right-to-left two-page book unharmed from a trip through continuous', () => {
    const subject = book();
    const strip = applyEdit(
      subject,
      changedFields(subject, { ...bookForm(subject), layoutKind: 'continuous' }),
    );
    const back = applyEdit(
      strip,
      changedFields(strip, { ...bookForm(strip), layoutKind: 'paged' }),
    );

    expect(back.direction).toBe('rtl');
    expect(back.pagePairing).toBe('double');
  });

  it('sends direction again when the layout returns to pages', () => {
    const subject = book({ layoutKind: 'continuous', direction: 'ltr' });
    const edit = changedFields(subject, {
      ...bookForm(subject),
      layoutKind: 'paged',
      direction: 'rtl',
    });

    expect(edit).toEqual({ layoutKind: 'paged', direction: 'rtl' });
    expect(applyEdit(subject, edit).direction).toBe('rtl');
  });
});
