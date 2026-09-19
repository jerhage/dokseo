import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import type { Book, BookEdit } from '../domain/book';
import type { LibraryError } from '../domain/library-repository';
import type { SourceBuildError } from '../domain/source-builder';
import { suggestTitle } from '../domain/title';
import type { OpenFileError } from '../use-cases/open-file';
import { ACCEPTED_SUMMARY } from './accepted-formats';

export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type StorageUsage = { readonly usage: number; readonly quota: number };

function describeLibraryError(error: LibraryError): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That upload is no longer in your library.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so uploads cannot be kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function describeSourceBuildError(error: SourceBuildError): string {
  return match(error)
    .with({ kind: 'nothing-usable' }, () => `Nothing readable there. ${ACCEPTED_SUMMARY} only.`)
    .with(
      { kind: 'unreadable' },
      (unreadable) => `That upload could not be read: ${unreadable.cause}`,
    )
    .with({ kind: 'empty' }, () => 'No files arrived, so there was nothing to add.')
    .exhaustive();
}

function describeOpenFileError(error: OpenFileError): string {
  if (error.kind === 'source') return describeSourceBuildError(error.error);
  if (error.kind === 'storage') return describeLibraryError(error.error);
  const unhandled: never = error;
  return unhandled;
}

function revoke(urls: Iterable<string>): void {
  for (const url of urls) URL.revokeObjectURL(url);
}

function newestFirst(books: readonly Book[]): readonly Book[] {
  return books.toSorted((a, b) => b.addedAt - a.addedAt);
}

export class LibraryView {
  books = $state.raw<readonly Book[]>([]);
  covers = $state.raw<ReadonlyMap<BookId, string>>(new Map());
  status = $state<LibraryStatus>('idle');
  message = $state<string | null>(null);
  busy = $state(false);
  pending = $state.raw<string | null>(null);
  removing = $state.raw<BookId | null>(null);
  editing = $state.raw<BookId | null>(null);
  usage = $state.raw<StorageUsage | null>(null);

  #container: Container;
  #created = new Map<BookId, string>();
  #generation = 0;

  constructor(container: Container) {
    this.#container = container;
  }

  async load(): Promise<void> {
    const generation = ++this.#generation;
    this.status = 'loading';
    this.message = null;

    const listed = await this.#container.library.listBooks();
    if (generation !== this.#generation) return;
    if (!listed.ok) {
      this.status = 'failed';
      this.message = describeLibraryError(listed.error);
      return;
    }

    this.books = newestFirst(listed.value);
    this.status = 'ready';

    const covers = await this.#readCovers(this.books);
    if (generation !== this.#generation) {
      revoke(covers.values());
      return;
    }
    this.#adopt(covers);

    const estimate = await this.#container.library.readStorageUsage();
    if (generation !== this.#generation) return;
    this.usage = estimate;
  }

  async upload(files: readonly File[]): Promise<void> {
    if (files.length === 0) return;
    this.busy = true;
    this.message = null;
    this.pending = suggestTitle(
      files.map((file) => ({ name: file.name, path: file.webkitRelativePath })),
    );

    try {
      const opened = await this.#container.library.openFile(files);
      if (!opened.ok) {
        this.message = describeOpenFileError(opened.error);
        return;
      }
    } finally {
      this.busy = false;
      this.pending = null;
    }

    await this.load();
  }

  async remove(id: BookId): Promise<void> {
    if (this.removing !== null || this.editing !== null || this.busy) return;
    this.removing = id;
    this.message = null;

    try {
      const removed = await this.#container.library.removeBook(id);
      if (!removed.ok) {
        this.message = describeLibraryError(removed.error);
        return;
      }
    } finally {
      this.removing = null;
    }

    await this.load();
  }

  async edit(id: BookId, edit: BookEdit): Promise<void> {
    if (this.removing !== null || this.editing !== null || this.busy) return;
    this.editing = id;
    this.message = null;

    try {
      const edited = await this.#container.library.editBook(id, edit);
      if (!edited.ok) {
        this.message = describeLibraryError(edited.error);
        return;
      }
    } finally {
      this.editing = null;
    }

    await this.load();
  }

  dispose(): void {
    this.#generation += 1;
    revoke(this.#created.values());
    this.#created = new Map();
    this.covers = new Map();
  }

  async #readCovers(books: readonly Book[]): Promise<Map<BookId, string>> {
    const read = books.map(async (book) => {
      const cover = await this.#container.library.readCover(book.id);
      return cover.ok ? ([book.id, URL.createObjectURL(cover.value)] as const) : null;
    });
    const found = await Promise.all(read);
    return new Map(found.filter((entry) => entry !== null));
  }

  #adopt(covers: Map<BookId, string>): void {
    revoke(this.#created.values());
    this.#created = covers;
    this.covers = new Map(covers);
  }
}
