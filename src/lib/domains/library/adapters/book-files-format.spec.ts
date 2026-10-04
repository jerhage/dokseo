import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { BOOK_FILES, BOOK_ID_IN_NAME } from '$lib/shared/testing/stored-format/book-files-layout';
import type { BookFilesLayout } from '$lib/shared/testing/stored-format/book-files-layout';
import { PAGED_BOOK_ROW } from '$lib/shared/testing/stored-format/library-rows';
import { BOOK_FILES_CHANGED } from '$lib/shared/testing/stored-format/stored-shape';
import { INTRINSIC_ORDER } from '../domain/book/page-list';
import { bookFromStored } from '../domain/book/stored-book';
import { createLibraryRepository } from './indexeddb-opfs-library.repo';

type FileReach = { readonly directory: string; readonly name: string };

type WriteRequest = { readonly id: number; readonly directory: string; readonly name: string };

type Listener = (event: { readonly data: unknown }) => void;

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: () => Promise.resolve({}),
  putRecord: () => Promise.resolve(),
  deleteRecord: () => Promise.resolve(),
}));

const reached: FileReach[] = [];

class RecordingWorker {
  #listeners = new Map<string, Listener>();

  addEventListener(kind: string, listen: Listener): void {
    this.#listeners.set(kind, listen);
  }

  postMessage(request: WriteRequest): void {
    reached.push({ directory: request.directory, name: request.name });
    queueMicrotask(() =>
      this.#listeners.get('message')?.({ data: { kind: 'done', id: request.id } }),
    );
  }

  terminate(): void {}
}

function directoryHandle(directory: string) {
  return {
    getFileHandle: (name: string) => {
      reached.push({ directory, name });
      return Promise.resolve({ getFile: () => Promise.resolve(new File(['bytes'], name)) });
    },
    removeEntry: (name: string) => {
      reached.push({ directory, name });
      return Promise.resolve();
    },
  };
}

function layoutOf(files: readonly FileReach[], id: string): BookFilesLayout {
  const [source, cover] = files;
  return {
    directory: source?.directory ?? '',
    names: {
      source: source?.name.replace(id, BOOK_ID_IN_NAME) ?? '',
      cover: cover?.name.replace(id, BOOK_ID_IN_NAME) ?? '',
    },
  };
}

beforeEach(() => {
  reached.length = 0;
  vi.stubGlobal('indexedDB', {});
  vi.stubGlobal('Worker', RecordingWorker);
  vi.stubGlobal('navigator', {
    storage: {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: (name: string) => Promise.resolve(directoryHandle(name)),
        }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the 1.x OPFS book files', () => {
  const book = bookFromStored(PAGED_BOOK_ROW);

  it('writes the uploaded file and the cover of a book under the 1.x folder and names', async () => {
    await createLibraryRepository().add(
      book,
      new Blob(['source']),
      new Blob(['cover']),
      INTRINSIC_ORDER,
      () => undefined,
    );

    expect(layoutOf(reached, book.id), BOOK_FILES_CHANGED).toStrictEqual(BOOK_FILES);
    expect(new Set(reached.map((file) => file.directory)), BOOK_FILES_CHANGED).toStrictEqual(
      new Set([BOOK_FILES.directory]),
    );
  });

  it('reads the uploaded file and the cover of a book from the 1.x folder and names', async () => {
    const repository = createLibraryRepository();

    await repository.readSource(bookId(book.id));
    await repository.readCover(bookId(book.id));

    expect(layoutOf(reached, book.id), BOOK_FILES_CHANGED).toStrictEqual(BOOK_FILES);
  });
});
