import { useQueryClient } from '@tanstack/svelte-query';
import type { QueryClient } from '@tanstack/svelte-query';
import type { Notify } from '$lib/shared/notice';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { splitUpload } from '../domain/ingest/source-detection';
import { INSPECTING, SINGLE_BOOK } from '../domain/ingest/upload-progress';
import type { UploadBatch, UploadStage } from '../domain/ingest/upload-progress';
import type { OpenedUpload, OpenFileResult } from '../use-cases/open-file';
import { bookMatchingChosen } from './book-matching.svelte';
import { readingDefaultsChosen } from './reading-defaults.svelte';
import { openFileMutation } from '../queries/library-queries';
import type { LibraryWrites, UploadRequest } from '../queries/library-queries';
import { refreshLibrary } from './library-refresh';
import { uploadSummary } from './upload-summary';
import {
  NOT_UPLOADING,
  UPLOAD_FAILED,
  describeOpenFileError,
  describeSourceBuildError,
  nameOf,
  tallyOf,
  uploadNotice,
  uploadReported,
  uploadingBook,
} from './upload-rules';
import type { FailedBook, OpenBook, UploadFailure, UploadState } from './upload-rules';

class BookUpload {
  #state = $state.raw<UploadState>(NOT_UPLOADING);
  #notify: Notify;
  #client: QueryClient;
  #opening: WriteQuery<OpenFileResult, UploadRequest>;

  constructor(library: Pick<LibraryWrites, 'openFile'>, notify: Notify) {
    this.#notify = notify;
    this.#client = useQueryClient();
    this.#opening = writeQuery(() => openFileMutation(library));
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
    const defaults = readingDefaultsChosen();
    const opened: OpenedUpload[] = [];
    const failed: FailedBook[] = [];
    let lastBookOpened = false;

    try {
      for (const [index, book] of books.entries()) {
        this.#state = uploadingBook(book, index, books.length);
        const outcome = await this.#opening
          .run({
            files: book.files,
            matching,
            defaults,
            report: (event) => {
              this.#state = uploadReported(this.#state, event);
            },
          })
          .catch((cause: unknown): UploadFailure => ({ kind: 'threw', cause }));
        if (
          outcome.kind !== 'added' &&
          outcome.kind !== 'restored' &&
          outcome.kind !== 'already-held'
        ) {
          failed.push({ name: nameOf(book), failure: outcome });
          continue;
        }
        opened.push(outcome);
        if (books.length === 1) this.#notify(uploadNotice(outcome, openBook));
        lastBookOpened = index === books.length - 1;
        if (!lastBookOpened) await refreshLibrary(this.#client);
      }
    } finally {
      this.#state = NOT_UPLOADING;
    }

    if (lastBookOpened) await refreshLibrary(this.#client);
    this.#announce(books.length, opened, failed);
  }

  #announce(
    bookCount: number,
    opened: readonly OpenedUpload[],
    failed: readonly FailedBook[],
  ): void {
    if (bookCount === 1) {
      const [only] = failed;
      if (only !== undefined) this.#fail(describeOpenFileError(only.failure));
      return;
    }
    const summary = uploadSummary(tallyOf(opened, failed));
    if (summary !== null) this.#notify(summary);
  }

  #fail(message: string): void {
    this.#notify({ tone: 'danger', title: UPLOAD_FAILED, message });
  }
}

export { BookUpload };
