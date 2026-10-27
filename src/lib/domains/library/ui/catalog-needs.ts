import { bookIdHref } from '$lib/shared/reader-location';
import { bookMatchingChosen } from './book-matching.svelte';
import { describeOpenFileError } from './upload-rules';
import { refreshLibrary } from './library-refresh';
import { readingDefaultsChosen } from './reading-defaults.svelte';

const CATALOG_NEEDS = {
  matching: bookMatchingChosen,
  defaults: readingDefaultsChosen,
  describeOpenFile: describeOpenFileError,
  refreshLibrary,
  readerHref: bookIdHref,
};

export { CATALOG_NEEDS };
