import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError } from '../domain/book/library-repository';
import type { SourceBuildError } from '../domain/ingest/source-builder';
import { suggestTitle } from '../domain/book/title';
import { describeIngestLimit } from '../domain/ingest/ingest-limits';
import { INSPECTING } from '../domain/ingest/upload-progress';
import type { UploadStage } from '../domain/ingest/upload-progress';
import type { OpenFileError } from '../use-cases/open-file';
import { ACCEPTED_SUMMARY } from './accepted-formats';
import { describePageObstacle } from '../domain/ingest/epub-obstacle-text';
import { describeEpubRefusal } from './epub-refusal-text';

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'failed';

type ChangeOutcome = 'changed' | 'failed' | 'skipped';

const UPLOAD_FAILED = 'Could not add that upload';

const EDIT_FAILED = 'Could not save the book settings';

const REMOVE_FAILED = 'Could not remove that book';

const FINISH_FAILED = 'Could not mark that book finished';

const UNREAD_FAILED = 'Could not mark that book unread';

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

  async upload(files: readonly File[]): Promise<void> {
    if (files.length === 0) return;
    this.busy = true;
    this.pending = suggestTitle(
      files.map((file) => ({ name: file.name, path: file.webkitRelativePath })),
    );
    this.progress = INSPECTING;

    try {
      const opened = await this.#container.library.openFile(files, (stage) => {
        this.progress = stage;
      });
      if (!opened.ok) {
        this.#fail(UPLOAD_FAILED, describeOpenFileError(opened.error));
        return;
      }
    } finally {
      this.busy = false;
      this.pending = null;
      this.progress = INSPECTING;
    }

    await this.load();
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

  markFinished(id: BookId): Promise<void> {
    return this.#mark(id, FINISH_FAILED, () => this.#container.library.markFinished(id));
  }

  markUnread(id: BookId): Promise<void> {
    return this.#mark(id, UNREAD_FAILED, () => this.#container.library.markUnread(id));
  }

  dispose(): void {
    this.#generation += 1;
    revoke(this.#created.values());
    this.#created = new Map();
    this.covers = new Map();
  }

  async #mark(
    id: BookId,
    failed: string,
    run: () => Promise<Result<Book, LibraryError>>,
  ): Promise<void> {
    if (this.removing !== null || this.editing !== null || this.busy) return;
    this.editing = id;

    try {
      const marked = await run();
      if (!marked.ok) {
        this.#fail(failed, describeLibraryError(marked.error));
        return;
      }
    } finally {
      this.editing = null;
    }

    await this.load();
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

export { EDIT_FAILED, FINISH_FAILED, LibraryView, REMOVE_FAILED, UNREAD_FAILED, UPLOAD_FAILED };
export type { ChangeOutcome, LibraryStatus };
