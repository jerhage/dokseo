import type { Language } from '$lib/shared/language';
import type { LayoutKind, PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
import type { Book, BookEdit } from '../domain/book';

export type BookForm = {
  title: string;
  language: Language;
  layoutKind: LayoutKind;
  direction: ReadingDirection;
  pagePairing: PagePairing;
};

export function bookForm(book: Book): BookForm {
  return {
    title: book.title,
    language: book.language,
    layoutKind: book.layoutKind,
    direction: book.direction,
    pagePairing: book.pagePairing,
  };
}

export function changedFields(book: Book, form: Readonly<BookForm>): BookEdit {
  const edit: {
    title?: string;
    language?: Language;
    layoutKind?: LayoutKind;
    direction?: ReadingDirection;
    pagePairing?: PagePairing;
  } = {};

  const title = form.title.trim();
  if (title.length > 0 && title !== book.title) edit.title = title;
  if (form.language !== book.language) edit.language = form.language;
  if (form.layoutKind !== book.layoutKind) edit.layoutKind = form.layoutKind;
  if (form.direction !== book.direction) edit.direction = form.direction;
  if (form.pagePairing !== book.pagePairing) edit.pagePairing = form.pagePairing;

  return edit;
}
