import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
import type { Notify } from '$lib/shared/notice';
import type { LibraryWrites } from '../queries/library-queries';
import { BookDetailsView } from './book-details.svelte';
import type { DetailsHooks } from './book-details.svelte';
import { BookChanges } from './book-changes.svelte';
import { BookUpload } from './book-upload.svelte';
import { RemovedBookDeletion } from './removed-book-deletion.svelte';

class LibraryView {
  readonly upload: BookUpload;
  readonly changes: BookChanges;
  readonly removed: RemovedBookDeletion;
  readonly details: BookDetailsView;
  readonly exporting: BookCapturesExporting;

  constructor(
    library: LibraryWrites & BookCapturesExporting,
    notify: Notify,
    detailsHooks?: DetailsHooks,
  ) {
    this.details = new BookDetailsView(detailsHooks);
    this.upload = new BookUpload(library, notify);
    this.changes = new BookChanges(library, notify, () => this.upload.busy);
    this.removed = new RemovedBookDeletion(library, notify);
    this.exporting = library;
  }
}

export { LibraryView };
