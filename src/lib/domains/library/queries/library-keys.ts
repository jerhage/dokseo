import type { BookId } from '$lib/shared/ids';

const ALL = ['library'] as const;

const libraryKeys = {
  all: () => ALL,
  books: () => [...ALL, 'books'] as const,
  covers: (ids: readonly BookId[]) => [...ALL, 'covers', ids] as const,
  size: () => [...ALL, 'size'] as const,
};

export { libraryKeys };
