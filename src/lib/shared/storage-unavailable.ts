type StorageUnavailable = { readonly kind: 'storage-unavailable' };

const STORAGE_UNAVAILABLE: StorageUnavailable = { kind: 'storage-unavailable' };

const PRIVATE_WINDOW_ADVICE =
  'A private window does not save files, so open the library in a normal window to add a book.';

export { PRIVATE_WINDOW_ADVICE, STORAGE_UNAVAILABLE };
export type { StorageUnavailable };
