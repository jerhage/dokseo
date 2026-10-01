import type { Container } from '$lib/container';
import type { Notify } from '$lib/shared/notice';
import { BookChanges } from './book-changes.svelte';
import { BookUpload } from './book-upload.svelte';
import { LibraryBooks } from './library-books.svelte';

class LibraryView {
  readonly library: LibraryBooks;
  readonly upload: BookUpload;
  readonly changes: BookChanges;

  constructor(container: Container, notify: Notify) {
    this.library = new LibraryBooks(container);
    this.upload = new BookUpload(container, notify, this.library);
    this.changes = new BookChanges(container, notify, this.library, () => this.upload.busy);
  }
}

export { LibraryView };
