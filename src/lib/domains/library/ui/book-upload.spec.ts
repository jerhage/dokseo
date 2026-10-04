import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Book } from '../domain/book/book';
import { NOTHING_TO_MERGE } from '../domain/book/book-merge';
import { splitUpload } from '../domain/ingest/source-detection';
import {
  ALREADY_HELD,
  MERGED_ON_UPLOAD,
  MERGE_UNFINISHED,
  RESTORED_MESSAGE,
  describeFailedBook,
  describeOpenFileError,
  stageReached,
  tallyOf,
  uploadNotice,
  uploadReported,
  uploadingBook,
} from './book-upload.svelte';

function book(id: string, title: string): Book {
  return {
    id: bookId(id),
    title,
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 182,
    addedAt: 1,
    position: imagePlace(imageIndex(13)),
    lastReadAt: null,
    finishedAt: null,
  };
}

function chosen(name: string, path = ''): File {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

describe('uploadNotice', () => {
  it('announces an added book with an Open action that opens it', () => {
    const opened: string[] = [];

    const notice = uploadNotice({ kind: 'added', book: book('two', 'Blame! 2') }, (id) => {
      opened.push(id);
    });
    notice.action?.run();

    expect(notice).toEqual({
      tone: 'success',
      title: 'Added Blame! 2',
      action: { label: 'Open', run: expect.any(Function) },
      duration: ACTION_NOTICE_MS,
    });
    expect(opened).toEqual(['two']);
  });

  it('tells an upload it already holds apart from a new one, and still offers Open', () => {
    const notice = uploadNotice(
      { kind: 'already-held', book: book('one', 'Blame! 1'), merge: NOTHING_TO_MERGE },
      () => undefined,
    );

    expect(notice).toEqual({
      tone: 'info',
      title: ALREADY_HELD,
      message: 'Blame! 1',
      action: { label: 'Open', run: expect.any(Function) },
      duration: ACTION_NOTICE_MS,
    });
  });
});

describe('uploadNotice for a held book with unreadable copies', () => {
  it('says the old captures were moved onto the held book', () => {
    const notice = uploadNotice(
      { kind: 'already-held', book: book('one', 'Blame! 1'), merge: { kind: 'merged' } },
      () => undefined,
    );

    expect(notice).toMatchObject({
      tone: 'success',
      title: ALREADY_HELD,
      message: `Blame! 1. ${MERGED_ON_UPLOAD}`,
    });
  });

  it.each([{ kind: 'partly-merged' as const }, STORAGE_UNAVAILABLE])(
    'warns that the unreadable book notice finishes a merge that answered %j',
    (merge) => {
      const notice = uploadNotice(
        { kind: 'already-held', book: book('one', 'Blame! 1'), merge },
        () => undefined,
      );

      expect(notice).toMatchObject({
        tone: 'warning',
        title: ALREADY_HELD,
        message: `Blame! 1. ${MERGE_UNFINISHED}`,
      });
    },
  );
});

describe('uploadNotice for a restored book', () => {
  it('announces a restored book and says its captures came back', () => {
    const notice = uploadNotice(
      { kind: 'restored', book: book('one', 'Blame! 1') },
      () => undefined,
    );

    expect(notice).toEqual({
      tone: 'success',
      title: 'Restored Blame! 1',
      message: RESTORED_MESSAGE,
      action: { label: 'Open', run: expect.any(Function) },
      duration: ACTION_NOTICE_MS,
    });
  });
});

describe('uploadNotice for a renamed book', () => {
  it('names a restored or held book by its alias', () => {
    const renamed = { ...book('one', 'Blame! 1'), alias: 'Mine' };

    expect(uploadNotice({ kind: 'restored', book: renamed }, () => undefined).title).toBe(
      'Restored Mine',
    );
    expect(
      uploadNotice(
        { kind: 'already-held', book: renamed, merge: NOTHING_TO_MERGE },
        () => undefined,
      ).message,
    ).toBe('Mine');
  });
});

describe('describeOpenFileError', () => {
  it('names why an upload was refused', () => {
    expect(describeOpenFileError({ kind: 'source', failure: { kind: 'nothing-usable' } })).toBe(
      'Nothing readable there. Images, ZIP, CBZ, PDF or EPUB only.',
    );
    expect(describeOpenFileError({ kind: 'storage-unavailable' })).toBe(
      'This browser blocks local storage, so uploads cannot be kept. A private window does not save files, so open the library in a normal window to add a book.',
    );
    expect(describeOpenFileError({ kind: 'fingerprint', cause: 'no hashing here.' })).toBe(
      'This page cannot check uploads for duplicates here: no hashing here.',
    );
    expect(describeOpenFileError({ kind: 'threw', cause: new Error('disk full') })).toBe(
      'Something went wrong: disk full',
    );
  });
});

describe('describeFailedBook', () => {
  it('names each failed book by its file', () => {
    expect(
      describeFailedBook({
        name: 'a.pdf',
        failure: { kind: 'source', failure: { kind: 'unreadable', cause: 'bad xref' } },
      }),
    ).toBe('a.pdf could not be read: bad xref');
    expect(
      describeFailedBook({
        name: 'c.cbz',
        failure: { kind: 'threw', cause: new Error('disk full') },
      }),
    ).toBe('c.cbz: Something went wrong: disk full');
  });
});

describe('tallyOf', () => {
  it('counts the added and restored books apart from the held ones, and describes each failure', () => {
    expect(
      tallyOf(
        [
          { kind: 'added', book: book('a', 'a') },
          { kind: 'already-held', book: book('b', 'b'), merge: NOTHING_TO_MERGE },
          { kind: 'restored', book: book('d', 'd') },
        ],
        [{ name: 'c.cbz', failure: { kind: 'source', failure: { kind: 'empty' } } }],
      ),
    ).toEqual({
      added: 2,
      held: 1,
      failures: ['c.cbz: No files arrived, so there was nothing to add.'],
    });
  });
});

describe('uploadingBook', () => {
  it('titles each container in a folder after its own file name, at its place in the batch', () => {
    const books = splitUpload([
      chosen('vol2.pdf', 'Series/vol2.pdf'),
      chosen('vol1.pdf', 'Series/vol1.pdf'),
    ]);

    expect(books.map((held, index) => uploadingBook(held, index, books.length))).toEqual([
      {
        kind: 'uploading',
        title: 'vol1',
        stage: { kind: 'inspecting' },
        batch: { position: 1, total: 2 },
      },
      {
        kind: 'uploading',
        title: 'vol2',
        stage: { kind: 'inspecting' },
        batch: { position: 2, total: 2 },
      },
    ]);
  });
});

describe('stageReached', () => {
  it('moves a running upload to the stage it reports, and leaves an idle one alone', () => {
    const [only] = splitUpload([chosen('one.cbz')]);
    if (only === undefined) throw new Error('no book');
    const stage = { kind: 'covering', imageCount: 3 } as const;

    expect(stageReached(uploadingBook(only, 0, 1), stage)).toMatchObject({ stage });
    expect(stageReached({ kind: 'idle' }, stage)).toEqual({ kind: 'idle' });
  });
});

describe('uploadReported', () => {
  it('shows the file-name title until the upload reports the chosen title, then shows that', () => {
    const [only] = splitUpload([chosen('scan_0042.pdf')]);
    if (only === undefined) throw new Error('no book');
    const covering = { kind: 'covering', imageCount: 3 } as const;
    const storing = {
      kind: 'storing',
      imageCount: 3,
      writtenBytes: 0,
      totalBytes: 10,
      elapsedMs: 0,
    } as const;

    const started = uploadingBook(only, 0, 1);
    const covered = uploadReported(started, covering);
    const titled = uploadReported(covered, { kind: 'titled', title: 'よつばと! 1' });
    const stored = uploadReported(titled, storing);

    expect(started).toMatchObject({ title: 'scan_0042' });
    expect(covered).toMatchObject({ title: 'scan_0042', stage: covering });
    expect(titled).toMatchObject({ title: 'よつばと! 1', stage: covering });
    expect(stored).toMatchObject({ title: 'よつばと! 1', stage: storing });
  });

  it('leaves an idle upload alone when a title arrives', () => {
    expect(uploadReported({ kind: 'idle' }, { kind: 'titled', title: 'よつばと! 1' })).toEqual({
      kind: 'idle',
    });
  });
});
