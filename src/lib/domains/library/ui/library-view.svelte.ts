import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notice, Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError } from '../domain/book/library-repository';
import type { SourceBuildError } from '../domain/ingest/source-builder';
import { suggestTitle } from '../domain/book/title';
import { describeIngestLimit } from '../domain/ingest/ingest-limits';
import { splitUpload } from '../domain/ingest/source-detection';
import { uploadName } from '../domain/ingest/upload-name';
import { INSPECTING, SINGLE_BOOK } from '../domain/ingest/upload-progress';
import type { UploadBatch, UploadStage } from '../domain/ingest/upload-progress';
import type { OpenedUpload, OpenFileError } from '../use-cases/open-file';
import { ACCEPTED_SUMMARY } from './accepted-formats';
import { bookMatchingChosen } from './book-matching.svelte';
import { describePageObstacle } from '../domain/ingest/epub-obstacle-text';
import { describeEpubRefusal } from './epub-refusal-text';
import { onShelf } from './library-shelves';
import type { Shelf } from './library-shelves';

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'failed';

type ChangeOutcome = 'changed' | 'failed' | 'skipped';

type OpenBook = (id: BookId) => void;

type Mark = 'finished' | 'unread';

type FailedBook = { readonly name: string; readonly error: OpenFileError };

type UploadFailures =
  | { readonly kind: 'none' }
  | { readonly kind: 'the-only-book'; readonly error: OpenFileError }
  | {
      readonly kind: 'some-books';
      readonly failed: readonly FailedBook[];
      readonly total: number;
    };

const UPLOAD_FAILED = 'Could not add that upload';

const EDIT_FAILED = 'Could not save the book settings';

const REMOVE_FAILED = 'Could not remove that book';

const FINISH_FAILED = 'Could not mark that book finished';

const UNREAD_FAILED = 'Could not mark that book unread';

const UNDO_MARK_FAILED = 'Could not undo that change';

const ALREADY_HELD = 'Already in your library';

function uploadNotice(opened: OpenedUpload, openBook: OpenBook): Notice {
  const open = { label: 'Open', run: () => openBook(opened.book.id) };
  return match(opened)
    .with({ kind: 'added' }, ({ book }) => ({
      tone: 'success' as const,
      title: `Added ${book.title}`,
      action: open,
      duration: ACTION_NOTICE_MS,
    }))
    .with({ kind: 'already-held' }, ({ book }) => ({
      tone: 'info' as const,
      title: ALREADY_HELD,
      message: book.title,
      action: open,
      duration: ACTION_NOTICE_MS,
    }))
    .exhaustive();
}

function markedTitle(mark: Mark, book: Book): string {
  return mark === 'finished' ? `Marked ${book.title} finished` : `Marked ${book.title} unread`;
}

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
    .with({ kind: 'refused' }, (refused) => describeIngestLimit(refused.limit))
    .exhaustive();
}

function describeOpenFileError(error: OpenFileError): string {
  return match(error)
    .with({ kind: 'source' }, (source) => describeSourceBuildError(source.error))
    .with({ kind: 'storage' }, (storage) => describeLibraryError(storage.error))
    .with({ kind: 'epub' }, (epub) => describeEpubRefusal(epub.error))
    .with({ kind: 'not-paged' }, (blocked) => describePageObstacle(blocked.obstacle))
    .with({ kind: 'fingerprint' }, (failed) => describeFingerprintFailure(failed.cause))
    .exhaustive();
}

function describeFingerprintFailure(cause: string): string {
  return `This page cannot check uploads for duplicates here: ${cause}`;
}

function describeFailedBook(failed: FailedBook): string {
  return match(failed.error)
    .with(
      { kind: 'source', error: { kind: 'unreadable' } },
      (unreadable) => `${failed.name} could not be read: ${unreadable.error.cause}`,
    )
    .otherwise((error) => `${failed.name}: ${describeOpenFileError(error)}`);
}

function uploadFailures(failed: readonly FailedBook[], total: number): UploadFailures {
  const [only] = failed;
  if (only === undefined) return { kind: 'none' };
  if (total === 1) return { kind: 'the-only-book', error: only.error };
  return { kind: 'some-books', failed, total };
}

function failuresNotice(failures: UploadFailures): Notice | null {
  return match(failures)
    .returnType<Notice | null>()
    .with({ kind: 'none' }, () => null)
    .with({ kind: 'the-only-book' }, ({ error }) => ({
      tone: 'danger',
      title: UPLOAD_FAILED,
      message: describeOpenFileError(error),
    }))
    .with({ kind: 'some-books' }, ({ failed, total }) => ({
      tone: 'danger',
      title: `Could not add ${failed.length} of ${total} books`,
      message: failed.map(describeFailedBook).join(' · '),
    }))
    .exhaustive();
}

function titleOf(files: readonly File[]): string {
  return suggestTitle(files.map((file) => ({ name: file.name, path: file.webkitRelativePath })));
}

function nameOf(files: readonly File[]): string {
  const name = uploadName(files);
  return name.length > 0 ? name : titleOf(files);
}

function revoke(urls: Iterable<string>): void {
  for (const url of urls) URL.revokeObjectURL(url);
}

function newestFirst(books: readonly Book[]): readonly Book[] {
  return books.toSorted((a, b) => b.addedAt - a.addedAt);
}

class LibraryView {
  books = $state.raw<readonly Book[]>([]);
  covers = $state.raw<ReadonlyMap<BookId, string>>(new Map());
  status = $state<LibraryStatus>('idle');
  loadFailure = $state<string | null>(null);
  busy = $state(false);
  pending = $state.raw<string | null>(null);
  progress = $state.raw<UploadStage>(INSPECTING);
  batch = $state.raw<UploadBatch>(SINGLE_BOOK);
  removing = $state.raw<BookId | null>(null);
  editing = $state.raw<BookId | null>(null);
  storedBytes = $state.raw<number | null>(null);

  #container: Container;
  #notify: Notify;
  #created = new Map<BookId, string>();
  #generation = 0;

  constructor(container: Container, notify: Notify) {
    this.#container = container;
    this.#notify = notify;
  }

  get imageCounts(): ReadonlyMap<BookId, number> {
    return new Map(this.books.map((held) => [held.id, held.imageCount]));
  }

  async load(): Promise<void> {
    const generation = ++this.#generation;
    this.status = 'loading';
    this.loadFailure = null;

    const listed = await this.#container.library.listBooks();
    if (generation !== this.#generation) return;
    if (!listed.ok) {
      this.status = 'failed';
      this.loadFailure = describeLibraryError(listed.error);
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

    const size = await this.#container.library.readLibrarySize();
    if (generation !== this.#generation) return;
    this.storedBytes = size.ok ? size.value : null;
  }

  async upload(files: readonly File[], openBook: OpenBook): Promise<void> {
    if (files.length === 0) return;
    const books = splitUpload(files);
    if (books.length === 0) {
      this.#fail(UPLOAD_FAILED, describeSourceBuildError({ kind: 'nothing-usable' }));
      return;
    }
    this.busy = true;
    const matching = bookMatchingChosen();
    const failed: FailedBook[] = [];
    let added = false;

    try {
      for (const [index, book] of books.entries()) {
        this.pending = titleOf(book.files);
        this.progress = INSPECTING;
        this.batch = { position: index + 1, total: books.length };
        const opened = await this.#container.library.openFile(book.files, matching, (stage) => {
          this.progress = stage;
        });
        if (!opened.ok) {
          failed.push({ name: nameOf(book.files), error: opened.error });
          continue;
        }
        added = true;
        this.#notify(uploadNotice(opened.value, openBook));
      }
    } finally {
      this.busy = false;
      this.pending = null;
      this.progress = INSPECTING;
      this.batch = SINGLE_BOOK;
    }

    const notice = failuresNotice(uploadFailures(failed, books.length));
    if (notice !== null) this.#notify(notice);
    if (added) await this.load();
  }

  async remove(id: BookId): Promise<ChangeOutcome> {
    if (this.removing !== null || this.editing !== null || this.busy) return 'skipped';
    this.removing = id;

    try {
      const removed = await this.#container.library.removeBook(id);
      if (!removed.ok) {
        this.#fail(REMOVE_FAILED, describeLibraryError(removed.error));
        return 'failed';
      }
    } finally {
      this.removing = null;
    }

    await this.load();
    return 'changed';
  }

  async edit(id: BookId, edit: BookEdit): Promise<ChangeOutcome> {
    if (this.removing !== null || this.editing !== null || this.busy) return 'skipped';
    this.editing = id;

    try {
      const edited = await this.#container.library.editBook(id, edit);
      if (!edited.ok) {
        this.#fail(EDIT_FAILED, describeLibraryError(edited.error));
        return 'failed';
      }
    } finally {
      this.editing = null;
    }

    await this.load();
    return 'changed';
  }

  async markFinished(id: BookId, shelf: Shelf): Promise<void> {
    await this.#markOn(id, shelf, 'finished');
  }

  async markUnread(id: BookId, shelf: Shelf): Promise<void> {
    await this.#markOn(id, shelf, 'unread');
  }

  dispose(): void {
    this.#generation += 1;
    revoke(this.#created.values());
    this.#created = new Map();
    this.covers = new Map();
  }

  async #markOn(id: BookId, shelf: Shelf, mark: Mark): Promise<void> {
    const before = this.books.find((held) => held.id === id);
    const marked = await this.#mark(id, mark === 'finished' ? FINISH_FAILED : UNREAD_FAILED, () =>
      mark === 'finished'
        ? this.#container.library.markFinished(id)
        : this.#container.library.markUnread(id),
    );
    if (marked === null || before === undefined) return;
    if (!onShelf(before, shelf) || onShelf(marked, shelf)) return;

    this.#notify({
      tone: 'success',
      title: markedTitle(mark, marked),
      action: { label: 'Undo', run: () => void this.#undoMark(before) },
      duration: ACTION_NOTICE_MS,
    });
  }

  async #undoMark(before: Book): Promise<void> {
    await this.#mark(before.id, UNDO_MARK_FAILED, () =>
      this.#container.library.editBook(before.id, {
        finishedAt: before.finishedAt,
        position: before.position,
      }),
    );
  }

  async #mark(
    id: BookId,
    failed: string,
    run: () => Promise<Result<Book, LibraryError>>,
  ): Promise<Book | null> {
    if (this.removing !== null || this.editing !== null || this.busy) return null;
    this.editing = id;

    let marked: Book;
    try {
      const changed = await run();
      if (!changed.ok) {
        this.#fail(failed, describeLibraryError(changed.error));
        return null;
      }
      marked = changed.value;
    } finally {
      this.editing = null;
    }

    await this.load();
    return marked;
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
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

export {
  ALREADY_HELD,
  EDIT_FAILED,
  FINISH_FAILED,
  LibraryView,
  REMOVE_FAILED,
  UNDO_MARK_FAILED,
  UNREAD_FAILED,
  UPLOAD_FAILED,
};
export type { ChangeOutcome, LibraryStatus, OpenBook };
