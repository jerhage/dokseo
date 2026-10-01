import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notice, Notify } from '$lib/shared/notice';
import type { SourceBuildError } from '../domain/ingest/source-builder';
import { suggestTitle } from '../domain/book/title';
import { describeIngestLimit } from '../domain/ingest/ingest-limits';
import { splitUpload } from '../domain/ingest/source-detection';
import type { UploadBook } from '../domain/ingest/source-detection';
import { uploadName } from '../domain/ingest/upload-name';
import { INSPECTING, SINGLE_BOOK } from '../domain/ingest/upload-progress';
import type { UploadBatch, UploadStage } from '../domain/ingest/upload-progress';
import type { OpenedUpload, OpenFileError } from '../use-cases/open-file';
import { ACCEPTED_SUMMARY } from './accepted-formats';
import { bookMatchingChosen } from './book-matching.svelte';
import { describePageObstacle } from '../domain/ingest/epub-obstacle-text';
import { describeEpubRefusal } from './epub-refusal-text';
import type { LibraryBooks } from './library-books.svelte';
import { describeLibraryError } from './library-error-text';
import { uploadSummary } from './upload-summary';
import type { UploadTally } from './upload-summary';

type OpenBook = (id: BookId) => void;

type FailedBook = { readonly name: string; readonly error: OpenFileError };

type UploadState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'uploading';
      readonly title: string;
      readonly stage: UploadStage;
      readonly batch: UploadBatch;
    };

const NOT_UPLOADING: UploadState = { kind: 'idle' };

const UPLOAD_FAILED = 'Could not add that upload';

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

function titleOf(book: UploadBook<File>): string {
  return suggestTitle(
    book.sourceKind,
    book.files.map((file) => ({ name: file.name, path: file.webkitRelativePath })),
  );
}

function nameOf(book: UploadBook<File>): string {
  const name = uploadName(book.files);
  return name.length > 0 ? name : titleOf(book);
}

function tallyOf(opened: readonly OpenedUpload[], failed: readonly FailedBook[]): UploadTally {
  const added = opened.filter((upload) => upload.kind === 'added').length;
  return {
    added,
    held: opened.length - added,
    failures: failed.map(describeFailedBook),
  };
}

class BookUpload {
  #state = $state.raw<UploadState>(NOT_UPLOADING);
  #container: Container;
  #notify: Notify;
  #library: LibraryBooks;

  constructor(container: Container, notify: Notify, library: LibraryBooks) {
    this.#container = container;
    this.#notify = notify;
    this.#library = library;
  }

  get busy(): boolean {
    return this.#state.kind === 'uploading';
  }

  get pending(): string | null {
    return this.#state.kind === 'uploading' ? this.#state.title : null;
  }

  get progress(): UploadStage {
    return this.#state.kind === 'uploading' ? this.#state.stage : INSPECTING;
  }

  get batch(): UploadBatch {
    return this.#state.kind === 'uploading' ? this.#state.batch : SINGLE_BOOK;
  }

  async add(files: readonly File[], openBook: OpenBook): Promise<void> {
    if (files.length === 0) return;
    const books = splitUpload(files);
    if (books.length === 0) {
      this.#fail(describeSourceBuildError({ kind: 'nothing-usable' }));
      return;
    }
    const matching = bookMatchingChosen();
    const opened: OpenedUpload[] = [];
    const failed: FailedBook[] = [];
    let lastBookOpened = false;

    try {
      for (const [index, book] of books.entries()) {
        this.#state = {
          kind: 'uploading',
          title: titleOf(book),
          stage: INSPECTING,
          batch: { position: index + 1, total: books.length },
        };
        const outcome = await this.#container.library.openFile(book.files, matching, (stage) => {
          this.#stageReached(stage);
        });
        if (!outcome.ok) {
          failed.push({ name: nameOf(book), error: outcome.error });
          continue;
        }
        opened.push(outcome.value);
        if (books.length === 1) this.#notify(uploadNotice(outcome.value, openBook));
        lastBookOpened = index === books.length - 1;
        if (!lastBookOpened) await this.#library.load();
      }
    } finally {
      this.#state = NOT_UPLOADING;
    }

    if (lastBookOpened) await this.#library.load();
    this.#announce(books.length, opened, failed);
  }

  #stageReached(stage: UploadStage): void {
    if (this.#state.kind === 'uploading') this.#state = { ...this.#state, stage };
  }

  #announce(
    bookCount: number,
    opened: readonly OpenedUpload[],
    failed: readonly FailedBook[],
  ): void {
    if (bookCount === 1) {
      const [only] = failed;
      if (only !== undefined) this.#fail(describeOpenFileError(only.error));
      return;
    }
    const summary = uploadSummary(tallyOf(opened, failed));
    if (summary !== null) this.#notify(summary);
  }

  #fail(message: string): void {
    this.#notify({ tone: 'danger', title: UPLOAD_FAILED, message });
  }
}

export { ALREADY_HELD, BookUpload, UPLOAD_FAILED };
export type { OpenBook, UploadState };
