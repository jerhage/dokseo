import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import { BOOK_MATCHINGS, DEFAULT_BOOK_MATCHING } from '../domain/book/book-matching';
import type { BookMatching } from '../domain/book/book-matching';

const BOOK_MATCHING_KEY = 'reader.library.matching';

type BookMatchingOption = {
  readonly matching: BookMatching;
  readonly label: string;
  readonly hint: string;
};

const BOOK_MATCHING_OPTIONS: readonly BookMatchingOption[] = [
  {
    matching: 'content',
    label: 'Content',
    hint: 'A file joins a book only when its sampled bytes are the same. Renaming a file keeps it.',
  },
  {
    matching: 'file-name',
    label: 'File name',
    hint: 'A file whose name matches a book also joins it, even when its bytes differ.',
  },
];

function toBookMatching(stored: string | null): BookMatching {
  return BOOK_MATCHINGS.find((matching) => matching === stored) ?? DEFAULT_BOOK_MATCHING;
}

function readBookMatching(locate?: LocateStore): BookMatching {
  return toBookMatching(rememberedString(BOOK_MATCHING_KEY, locate).read());
}

function saveBookMatching(matching: BookMatching, locate?: LocateStore): void {
  rememberedString(BOOK_MATCHING_KEY, locate).write(matching);
}

export {
  BOOK_MATCHING_KEY,
  BOOK_MATCHING_OPTIONS,
  readBookMatching,
  saveBookMatching,
  toBookMatching,
};
export type { BookMatchingOption };
