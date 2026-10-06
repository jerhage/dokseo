import { imageLayoutKind } from '$lib/shared/layout-kind';
import type { Language } from '$lib/shared/language';
import { aliasFor, shownTitle } from '$lib/shared/shown-title';
import type { ImageLayoutKind, PagePairingChoice, ReadingDirection } from '$lib/shared/layout-kind';
import type { Book, BookEdit } from '../domain/book/book';
import type { LanguageDefaults } from '../domain/book/reading-defaults';

type BookForm = {
  title: string;
  language: Language;
  layoutKind: ImageLayoutKind | null;
  direction: ReadingDirection;
  pagePairing: PagePairingChoice;
};

function bookForm(book: Book): BookForm {
  return {
    title: shownTitle(book),
    language: book.language,
    layoutKind: imageLayoutKind(book.layoutKind),
    direction: book.direction,
    pagePairing: book.pagePairing,
  };
}

function formInLanguage(
  form: Readonly<BookForm>,
  language: Language,
  defaults: LanguageDefaults,
): BookForm {
  return {
    ...form,
    language,
    layoutKind: form.layoutKind === null ? null : defaults.layoutKind,
    direction: defaults.direction,
    pagePairing: defaults.pagePairing,
  };
}

function originalTitleHint(book: Book): string | undefined {
  if (book.alias === null) return undefined;
  return `Original title: ${book.title}. Clear the field to use it again.`;
}

function changedFields(book: Book, form: Readonly<BookForm>): BookEdit {
  const edit: {
    alias?: string | null;
    language?: Language;
    layoutKind?: ImageLayoutKind;
    direction?: ReadingDirection;
    pagePairing?: PagePairingChoice;
  } = {};

  const alias = aliasFor(book.title, form.title);
  if (alias !== book.alias) edit.alias = alias;
  if (form.language !== book.language) edit.language = form.language;
  const layoutKind = form.layoutKind;
  if (layoutKind !== null && layoutKind !== book.layoutKind) edit.layoutKind = layoutKind;
  if (form.direction !== book.direction) edit.direction = form.direction;
  if (form.pagePairing !== book.pagePairing) edit.pagePairing = form.pagePairing;

  return edit;
}

export { bookForm, changedFields, formInLanguage, originalTitleHint };
export type { BookForm };
