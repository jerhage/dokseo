import { imageLayoutKind } from '$lib/shared/layout-kind';
import type { Language } from '$lib/shared/language';
import type { ImageLayoutKind, PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
import type { Book, BookEdit } from '../domain/book/book';

type BookForm = {
  title: string;
  language: Language;
  layoutKind: ImageLayoutKind | null;
  direction: ReadingDirection;
  pagePairing: PagePairing;
};

function bookForm(book: Book): BookForm {
  return {
    title: book.title,
    language: book.language,
    layoutKind: imageLayoutKind(book.layoutKind),
    direction: book.direction,
    pagePairing: book.pagePairing,
  };
}

function changedFields(book: Book, form: Readonly<BookForm>): BookEdit {
  const edit: {
    title?: string;
    language?: Language;
    layoutKind?: ImageLayoutKind;
    direction?: ReadingDirection;
    pagePairing?: PagePairing;
  } = {};

  const title = form.title.trim();
  if (title.length > 0 && title !== book.title) edit.title = title;
  if (form.language !== book.language) edit.language = form.language;
  const layoutKind = form.layoutKind;
  if (layoutKind !== null && layoutKind !== book.layoutKind) edit.layoutKind = layoutKind;
  if (form.direction !== book.direction) edit.direction = form.direction;
  if (form.pagePairing !== book.pagePairing) edit.pagePairing = form.pagePairing;

  return edit;
}

export { bookForm, changedFields };
export type { BookForm };
