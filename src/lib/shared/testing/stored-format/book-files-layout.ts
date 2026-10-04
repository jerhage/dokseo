type BookFilesLayout = {
  readonly directory: string;
  readonly names: { readonly source: string; readonly cover: string };
};

const BOOK_ID_IN_NAME = '<bookId>';

const BOOK_FILES: BookFilesLayout = {
  directory: 'blobs',
  names: { source: '<bookId>.src', cover: '<bookId>.cover' },
};

export { BOOK_FILES, BOOK_ID_IN_NAME };
export type { BookFilesLayout };
