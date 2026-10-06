import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { ImageLayoutKind, PagePairingChoice, ReadingDirection } from '$lib/shared/layout-kind';
import type { Notify } from '$lib/shared/notice';
import type { PageFit } from '$lib/shared/page-fit';
import { unexpectedMessage } from '$lib/shared/unexpected-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { editBookMutation } from '../queries/viewing-queries';
import type { BookEditRequest } from '../queries/viewing-queries';
import { heldBook, shownBook } from './reader-opening';
import type { FlowBook, ReaderBook, ReaderOpening } from './reader-opening';
import type { RegionSelection } from './region-selection.svelte';

type EditOutcome = Awaited<ReturnType<Container['library']['editBook']>>;

type BookEdit = Parameters<Container['library']['editBook']>[1];

type EditFailure = Exclude<EditOutcome, { readonly kind: 'success' }>;

type BookChanged = () => void;

type BookHeld = (book: ReaderBook) => void;

type LanguageEdit = (book: ReaderBook | FlowBook, language: Language) => BookEdit;

function languageOnly(_book: ReaderBook | FlowBook, language: Language): BookEdit {
  return { language };
}

function regroups(edit: BookEdit): boolean {
  return edit.layoutKind !== undefined || edit.pagePairing !== undefined;
}

const LAYOUT_FAILED = 'Could not change the layout';

const PAIRING_FAILED = 'Could not change the page pairing';

const DIRECTION_FAILED = 'Could not change the reading direction';

const FIT_FAILED = 'Could not change the page fit';

const LANGUAGE_FAILED = 'Could not change the language';

function describeEditFailure(error: EditFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer in your library.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so your place cannot be kept.',
    )
    .exhaustive();
}

class BookPreferences {
  saving = $state(false);

  #notify: Notify;
  #opening: () => ReaderOpening;
  #generation: () => number;
  #selection: RegionSelection;
  #held: BookHeld;
  #languageEdit: LanguageEdit;
  #editing: WriteQuery<EditOutcome, BookEditRequest<BookEdit>>;

  constructor(
    container: Container,
    notify: Notify,
    opening: () => ReaderOpening,
    generation: () => number,
    selection: RegionSelection,
    held: BookHeld,
    bookChanged: BookChanged | null,
    languageEdit: LanguageEdit,
  ) {
    this.#notify = notify;
    this.#opening = opening;
    this.#generation = generation;
    this.#selection = selection;
    this.#held = held;
    this.#languageEdit = languageEdit;
    this.#editing = writeQuery(() => ({
      ...editBookMutation(container.library),
      onSuccess: (saved) => {
        if (saved.kind === 'success') bookChanged?.();
      },
    }));
  }

  async setLayoutKind(kind: ImageLayoutKind): Promise<void> {
    const book = shownBook(this.#opening());
    if (book === null || this.saving || book.layoutKind === kind) return;
    this.#selection.clear();
    await this.#edit(book.id, { layoutKind: kind }, LAYOUT_FAILED);
  }

  async setPairing(pairing: PagePairingChoice): Promise<void> {
    const book = shownBook(this.#opening());
    if (book === null || this.saving || book.pagePairing === pairing) return;
    this.#selection.clear();
    await this.#edit(book.id, { pagePairing: pairing }, PAIRING_FAILED);
  }

  async setDirection(direction: ReadingDirection): Promise<void> {
    const book = shownBook(this.#opening());
    if (book === null || this.saving || book.direction === direction) return;
    await this.#edit(book.id, { direction }, DIRECTION_FAILED);
  }

  async setLanguage(language: Language): Promise<void> {
    const book = heldBook(this.#opening());
    if (book === null || this.saving || book.language === language) return;
    const edit = this.#languageEdit(book, language);
    if (regroups(edit)) this.#selection.clear();
    await this.#edit(book.id, edit, LANGUAGE_FAILED);
  }

  async setPageFit(fit: PageFit): Promise<void> {
    const book = shownBook(this.#opening());
    if (book === null || book.pageFit === fit) return;
    await this.#edit(book.id, { pageFit: fit }, FIT_FAILED);
  }

  async #edit(id: BookId, edit: BookEdit, failed: string): Promise<void> {
    const generation = this.#generation();
    this.saving = true;

    try {
      const saved = await this.#editing.run({ id, edit });
      if (generation !== this.#generation()) return;
      if (saved.kind !== 'success') {
        this.#fail(failed, describeEditFailure(saved));
        return;
      }
      this.#held(saved.book);
    } catch (cause) {
      if (generation !== this.#generation()) return;
      this.#fail(failed, unexpectedMessage(cause));
    } finally {
      this.saving = false;
    }
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }
}

export {
  BookPreferences,
  DIRECTION_FAILED,
  FIT_FAILED,
  LANGUAGE_FAILED,
  LAYOUT_FAILED,
  PAIRING_FAILED,
  describeEditFailure,
  languageOnly,
};
export type { BookChanged, BookHeld, LanguageEdit };
