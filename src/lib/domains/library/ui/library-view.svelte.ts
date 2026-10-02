import type { Notify } from '$lib/shared/notice';
import type { LibraryWrites } from '../queries/library-queries';
import { BookChanges } from './book-changes.svelte';
import { BookUpload } from './book-upload.svelte';
import { RemovedBookDeletion } from './removed-book-deletion.svelte';

class LibraryView {
  readonly upload: BookUpload;
  readonly changes: BookChanges;
  readonly removed: RemovedBookDeletion;

  constructor(library: LibraryWrites, notify: Notify) {
    this.upload = new BookUpload(library, notify);
    this.changes = new BookChanges(library, notify, () => this.upload.busy);
    this.removed = new RemovedBookDeletion(library, notify);
  }
}

export { LibraryView };
