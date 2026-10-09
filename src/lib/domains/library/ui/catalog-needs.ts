import type { BookId } from '$lib/shared/ids';
import { bookMatchingChosen } from './book-matching.svelte';
import { describeOpenFileError } from './upload-rules';
import { refreshLibrary } from './library-refresh';
import { readingDefaultsChosen } from './reading-defaults.svelte';

function readerHref(id: BookId): string {
  return `/read/${encodeURIComponent(id)}`;
}

const CATALOG_NEEDS = {
  matching: bookMatchingChosen,
  defaults: readingDefaultsChosen,
  describeOpenFile: describeOpenFileError,
  refreshLibrary,
  readerHref,
};

export { CATALOG_NEEDS };
