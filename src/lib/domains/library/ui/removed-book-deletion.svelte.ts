import { useQueryClient } from '@tanstack/svelte-query';
import type { BookId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { CapturesDeletion } from '../domain/book/removed-book';
import { describeLibraryRefusal } from '../queries/library-error-text';
import { deleteRemovedCapturesMutation } from '../queries/library-queries';
import type { LibraryWrites } from '../queries/library-queries';
import type { ChangeOutcome } from './book-changes.svelte';
import { refreshLibrary } from './library-refresh';

const DELETE_CAPTURES_FAILED = 'Could not delete those captures';

class RemovedBookDeletion {
  #deleting = $state<BookId | null>(null);
  #notify: Notify;
  #deletion: WriteQuery<CapturesDeletion, BookId>;

  constructor(library: Pick<LibraryWrites, 'deleteRemovedBookCaptures'>, notify: Notify) {
    const client = useQueryClient();
    this.#notify = notify;
    this.#deletion = writeQuery(() => ({
      ...deleteRemovedCapturesMutation(library),
      onSettled: () => refreshLibrary(client),
      onError: (cause) => this.#fail(failureMessage(cause)),
    }));
  }

  get deleting(): BookId | null {
    return this.#deleting;
  }

  async delete(id: BookId): Promise<ChangeOutcome> {
    if (this.#deleting !== null) return 'skipped';
    this.#deleting = id;
    try {
      const deleted = await this.#deletion.run(id);
      if (deleted.kind === 'success') return 'changed';
      this.#fail(describeLibraryRefusal(deleted));
      return 'failed';
    } catch {
      return 'failed';
    } finally {
      this.#deleting = null;
    }
  }

  #fail(message: string): void {
    this.#notify({ tone: 'danger', title: DELETE_CAPTURES_FAILED, message });
  }
}

export { DELETE_CAPTURES_FAILED, RemovedBookDeletion };
