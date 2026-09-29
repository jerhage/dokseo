import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { noTrace } from '$lib/platform/trace/pipeline-trace';
import type { Container } from '$lib/container';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError } from '../domain/book/library-repository';
import type { UploadReport } from '../domain/ingest/upload-progress';
import type { OpenedUpload, OpenFileError } from '../use-cases/open-file';
import type { Notice, Notify } from '$lib/shared/notice';
import {
  ALREADY_HELD,
  EDIT_FAILED,
  FINISH_FAILED,
  LibraryView,
  REMOVE_FAILED,
  UNDO_MARK_FAILED,
  UNREAD_FAILED,
  UPLOAD_FAILED,
} from './library-view.svelte';
import type { OpenBook } from './library-view.svelte';

type Deferred<T> = { readonly promise: Promise<T>; readonly settle: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let settle: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id: bookId(id),
    title: id,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 182,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(13)),
    lastReadAt: null,
    finishedAt: null,
    ...overrides,
  };
}

type CoverState = {
  outcome: Result<Blob, LibraryError>;
  gate: () => Promise<void>;
};

type SizeState = { outcome: Result<number, LibraryError> };

type Mark = {
  readonly kind: 'finished' | 'unread';
  readonly id: string;
  readonly outcome: Deferred<Result<Book, LibraryError>>;
};

type Fakes = {
  readonly container: Container;
  readonly lists: Deferred<Result<readonly Book[], LibraryError>>[];
  readonly opens: Deferred<Result<OpenedUpload, OpenFileError>>[];
  readonly reports: (UploadReport | undefined)[];
  readonly removes: Deferred<Result<void, LibraryError>>[];
  readonly edits: Deferred<Result<Book, LibraryError>>[];
  readonly marks: Mark[];
  readonly cover: CoverState;
  readonly size: SizeState;
  readonly notices: Notice[];
  readonly notify: Notify;
  readonly editCalls: { readonly id: string; readonly edit: BookEdit }[];
  readonly opened: string[];
  readonly open: OpenBook;
};

function fakes(): Fakes {
  const lists: Deferred<Result<readonly Book[], LibraryError>>[] = [];
  const opens: Deferred<Result<OpenedUpload, OpenFileError>>[] = [];
  const reports: (UploadReport | undefined)[] = [];
  const removes: Deferred<Result<void, LibraryError>>[] = [];
  const edits: Deferred<Result<Book, LibraryError>>[] = [];
  const marks: Mark[] = [];
  const cover: CoverState = { outcome: ok(new Blob(['cover'])), gate: () => Promise.resolve() };
  const size: SizeState = { outcome: ok(2048) };
  const notices: Notice[] = [];
  const notify: Notify = (notice) => {
    notices.push(notice);
  };
  const editCalls: { readonly id: string; readonly edit: BookEdit }[] = [];
  const opened: string[] = [];
  const open: OpenBook = (id) => {
    opened.push(id);
  };

  const container: Container = {
    beginTrace: noTrace,
    library: {
      openFile: (_files, report) => {
        const next = deferred<Result<OpenedUpload, OpenFileError>>();
        opens.push(next);
        reports.push(report);
        return next.promise;
      },
      openForReading: (id) =>
        Promise.resolve(err({ kind: 'library', error: { kind: 'not-found', id } })),
      listBooks: () => {
        const next = deferred<Result<readonly Book[], LibraryError>>();
        lists.push(next);
        return next.promise;
      },
      readBook: () => Promise.reject(new Error('not used')),
      readCover: () => cover.gate().then(() => cover.outcome),
      readSource: () => Promise.reject(new Error('not used')),
      removeBook: () => {
        const next = deferred<Result<void, LibraryError>>();
        removes.push(next);
        return next.promise;
      },
      editBook: (id, edit) => {
        editCalls.push({ id, edit });
        const next = deferred<Result<Book, LibraryError>>();
        edits.push(next);
        return next.promise;
      },
      saveReadingPlace: () => Promise.reject(new Error('not used')),
      markFinished: (id) => {
        const outcome = deferred<Result<Book, LibraryError>>();
        marks.push({ kind: 'finished', id, outcome });
        return outcome.promise;
      },
      markUnread: (id) => {
        const outcome = deferred<Result<Book, LibraryError>>();
        marks.push({ kind: 'unread', id, outcome });
        return outcome.promise;
      },
      readLibrarySize: () => Promise.resolve(size.outcome),
      readPageSizes: () => Promise.reject(new Error('not used')),
    },
    recognition: {
      readModelConsent: () => Promise.reject(new Error('not used')),
      grantModelConsent: () => Promise.reject(new Error('not used')),
      recognizeRegion: () => Promise.reject(new Error('not used')),
      listCaptures: () => Promise.reject(new Error('not used')),
      listEveryCapture: () => Promise.reject(new Error('not used')),
      saveCapture: () => Promise.reject(new Error('not used')),
      writeNote: () => Promise.reject(new Error('not used')),
      editCaptureText: () => Promise.reject(new Error('not used')),
      writeCaptureNote: () => Promise.reject(new Error('not used')),
      removeCapture: () => Promise.reject(new Error('not used')),
      restoreCapture: () => Promise.reject(new Error('not used')),
      clearCaptures: () => Promise.reject(new Error('not used')),
      listTags: () => Promise.reject(new Error('not used')),
      createTag: () => Promise.reject(new Error('not used')),
      addTagToCapture: () => Promise.reject(new Error('not used')),
      removeTagFromCapture: () => Promise.reject(new Error('not used')),
      renameTag: () => Promise.reject(new Error('not used')),
      recolourTag: () => Promise.reject(new Error('not used')),
      deleteTag: () => Promise.reject(new Error('not used')),
      readModelStorage: () => Promise.reject(new Error('not used')),
      deleteModel: () => Promise.reject(new Error('not used')),
      readRecognizerSetup: () => Promise.reject(new Error('not used')),
      saveRecognizerSetup: () => Promise.reject(new Error('not used')),
      detectCompute: () => Promise.reject(new Error('not used')),
      prepareRecognizer: () => Promise.reject(new Error('not used')),
      pauseModelLoad: () => Promise.reject(new Error('not used')),
      cancelModelLoad: () => Promise.reject(new Error('not used')),
      closeRecognizer: () => Promise.reject(new Error('not used')),
    },
    flowing: {
      readReadingSettings: () => Promise.reject(new Error('not used')),
      saveReadingSettings: () => Promise.reject(new Error('not used')),
    },
    storage: {
      readStorageAccount: () => Promise.reject(new Error('not used')),
    },
  };

  return {
    container,
    lists,
    opens,
    reports,
    removes,
    edits,
    marks,
    cover,
    size,
    notices,
    notify,
    editCalls,
    opened,
    open,
  };
}

function chosen(name: string, path = ''): File {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

async function settleMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
}

let created: string[] = [];
let revoked: string[] = [];
let originalCreate: typeof URL.createObjectURL | undefined;
let originalRevoke: typeof URL.revokeObjectURL | undefined;

beforeEach(() => {
  created = [];
  revoked = [];
  originalCreate = URL.createObjectURL;
  originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => {
    const url = `blob:cover-${created.length + 1}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };
});

afterEach(() => {
  URL.createObjectURL = originalCreate as typeof URL.createObjectURL;
  URL.revokeObjectURL = originalRevoke as typeof URL.revokeObjectURL;
});

describe('LibraryView', () => {
  it('moves from idle to loading to ready and exposes the books', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);
    expect(view.status).toBe('idle');

    const running = view.load();
    expect(view.status).toBe('loading');

    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await running;

    expect(view.status).toBe('ready');
    expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
    expect(view.covers.size).toBe(2);
    expect(world.notices).toEqual([]);
  });

  it('exposes the bytes the uploads occupy once the library has loaded', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);
    expect(view.storedBytes).toBeNull();

    const running = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await running;

    expect(view.storedBytes).toBe(2048);
  });

  it('reports no size when the uploads cannot be measured', async () => {
    const world = fakes();
    world.size.outcome = err({ kind: 'storage-unavailable' });
    const view = new LibraryView(world.container, world.notify);

    const running = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await running;

    expect(view.status).toBe('ready');
    expect(view.storedBytes).toBeNull();
  });

  it('orders the newest upload first', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const running = view.load();
    at(world.lists, 0).settle(ok([book('older', { addedAt: 1 }), book('newer', { addedAt: 2 })]));
    await running;

    expect(view.books.map((b) => b.id)).toEqual(['newer', 'older']);
  });

  it('lands a repository failure in the failed status without throwing', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const running = view.load();
    at(world.lists, 0).settle(err({ kind: 'storage-failed', cause: 'quota exceeded' }));
    await expect(running).resolves.toBeUndefined();

    expect(view.status).toBe('failed');
    expect(view.loadFailure).toBe('Local storage failed: quota exceeded');
    expect(world.notices).toEqual([]);
    expect(view.books).toEqual([]);
  });

  it('keeps a book whose cover cannot be read', async () => {
    const world = fakes();
    world.cover.outcome = err({ kind: 'not-found', id: bookId('one') });
    const view = new LibraryView(world.container, world.notify);

    const running = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await running;

    expect(view.status).toBe('ready');
    expect(view.books).toHaveLength(1);
    expect(view.covers.size).toBe(0);
  });

  it('revokes every object URL it created when disposed', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const running = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await running;

    view.dispose();

    expect(revoked).toEqual(created);
    expect(view.covers.size).toBe(0);
  });

  it('revokes the replaced object URLs on a second load', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const first = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await first;

    const second = view.load();
    at(world.lists, 1).settle(ok([book('one')]));
    await second;

    expect(revoked).toEqual([created[0]]);
    expect(view.covers.get(bookId('one'))).toBe(created[1]);
  });

  it('lets the later of two overlapping loads win', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const first = view.load();
    const second = view.load();

    at(world.lists, 1).settle(ok([book('late')]));
    await second;
    at(world.lists, 0).settle(ok([book('early')]));
    await first;

    expect(view.books.map((b) => b.id)).toEqual(['late']);
    expect(view.status).toBe('ready');
  });

  it('revokes the covers a stale load created', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);
    const held = deferred<void>();
    world.cover.gate = () => held.promise;

    const first = view.load();
    at(world.lists, 0).settle(ok([book('early')]));
    await settleMicrotasks();

    world.cover.gate = () => Promise.resolve();
    const second = view.load();
    at(world.lists, 1).settle(ok([book('late')]));
    await second;

    held.settle();
    await first;

    expect(view.books.map((b) => b.id)).toEqual(['late']);
    expect(view.covers.size).toBe(1);
    expect(revoked).toEqual([created[1]]);
  });

  it('reports an upload failure and keeps the books it already has', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const uploading = view.upload([chosen('page.png')], world.open);
    expect(view.busy).toBe(true);

    at(world.opens, 0).settle(err({ kind: 'source', error: { kind: 'nothing-usable' } }));
    await expect(uploading).resolves.toBeUndefined();

    expect(view.busy).toBe(false);
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: UPLOAD_FAILED,
        message: 'Nothing readable there. Images, ZIP, CBZ, PDF or EPUB only.',
      },
    ]);
    expect(view.books.map((b) => b.id)).toEqual(['one']);
    expect(view.status).toBe('ready');
  });

  it('reloads the library after a successful upload', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const uploading = view.upload([chosen('page.png')], world.open);
    at(world.opens, 0).settle(ok({ kind: 'added', book: book('two') }));
    await Promise.resolve();
    await Promise.resolve();
    at(world.lists, 1).settle(ok([book('one'), book('two')]));
    await uploading;

    expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
    expect(world.notices.map((notice) => notice.tone)).toEqual(['success']);
  });

  it('sets the pending title while the upload runs and clears it afterwards', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const uploading = view.upload([chosen('001.png', 'Blame/001.png')], world.open);
    expect(view.pending).toBe('Blame');

    at(world.opens, 0).settle(ok({ kind: 'added', book: book('two') }));
    await settleMicrotasks();
    expect(view.pending).toBeNull();

    at(world.lists, 1).settle(ok([book('one'), book('two')]));
    await uploading;

    expect(view.pending).toBeNull();
    expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
  });

  it('clears the pending title when the upload fails', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const uploading = view.upload([chosen('chapter-1.cbz')], world.open);
    expect(view.pending).toBe('chapter-1');

    at(world.opens, 0).settle(
      err({ kind: 'source', error: { kind: 'unreadable', cause: 'bad zip' } }),
    );
    await uploading;

    expect(view.pending).toBeNull();
    expect(world.notices).toEqual([
      { tone: 'danger', title: UPLOAD_FAILED, message: 'That upload could not be read: bad zip' },
    ]);
  });

  it('starts an upload at the inspecting stage', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const uploading = view.upload([chosen('chapter-1.cbz')], world.open);
    expect(view.progress).toEqual({ kind: 'inspecting' });

    at(world.opens, 0).settle(err({ kind: 'source', error: { kind: 'empty' } }));
    await uploading;
  });

  it('exposes each stage the upload reports as it arrives', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const uploading = view.upload([chosen('chapter-1.cbz')], world.open);
    const report = at(world.reports, 0);
    expect(report).toBeDefined();

    report?.({ kind: 'opening', sourceKind: 'archive' });
    expect(view.progress).toEqual({ kind: 'opening', sourceKind: 'archive' });

    report?.({
      kind: 'storing',
      imageCount: 186,
      writtenBytes: 20,
      totalBytes: 100,
      elapsedMs: 5000,
    });
    expect(view.progress).toEqual({
      kind: 'storing',
      imageCount: 186,
      writtenBytes: 20,
      totalBytes: 100,
      elapsedMs: 5000,
    });

    at(world.opens, 0).settle(err({ kind: 'source', error: { kind: 'empty' } }));
    await uploading;
  });

  it('returns the stage to inspecting once the upload settles', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const uploading = view.upload([chosen('chapter-1.cbz')], world.open);
    at(world.reports, 0)?.({ kind: 'covering', imageCount: 186 });

    at(world.opens, 0).settle(err({ kind: 'source', error: { kind: 'empty' } }));
    await uploading;

    expect(view.progress).toEqual({ kind: 'inspecting' });
  });

  it('reports no pending title before any upload', () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    expect(view.pending).toBeNull();
  });

  it('ignores an upload with no files', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    await view.upload([], world.open);

    expect(world.opens).toHaveLength(0);
    expect(view.busy).toBe(false);
  });

  it('removes a book and reloads the list', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const removing = view.remove(bookId('one'));
    at(world.removes, 0).settle(ok(undefined));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('two')]));
    await removing;

    expect(view.books.map((b) => b.id)).toEqual(['two']);
    expect(view.status).toBe('ready');
    expect(world.notices).toEqual([]);
  });

  it('sets removing while the call runs and clears it afterwards', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const removing = view.remove(bookId('one'));
    expect(view.removing).toBe('one');

    at(world.removes, 0).settle(ok(undefined));
    await settleMicrotasks();
    expect(view.removing).toBeNull();

    at(world.lists, 1).settle(ok([book('two')]));
    await removing;

    expect(view.removing).toBeNull();
  });

  it('clears removing and reports a message when the repository fails', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const removing = view.remove(bookId('one'));
    at(world.removes, 0).settle(err({ kind: 'storage-failed', cause: 'the disk went away' }));
    await expect(removing).resolves.toBe('failed');

    expect(view.removing).toBeNull();
    expect(world.notices).toEqual([
      { tone: 'danger', title: REMOVE_FAILED, message: 'Local storage failed: the disk went away' },
    ]);
    expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
    expect(world.lists).toHaveLength(1);
  });

  it('ignores a remove while another remove is running', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const first = view.remove(bookId('one'));
    await view.remove(bookId('two'));

    expect(world.removes).toHaveLength(1);
    expect(view.removing).toBe('one');

    at(world.removes, 0).settle(ok(undefined));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('two')]));
    await first;

    expect(view.books.map((b) => b.id)).toEqual(['two']);
  });

  it('ignores a remove while an upload is running', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const uploading = view.upload([chosen('page.png')], world.open);
    await view.remove(bookId('one'));

    expect(world.removes).toHaveLength(0);
    expect(view.removing).toBeNull();

    at(world.opens, 0).settle(err({ kind: 'source', error: { kind: 'empty' } }));
    await uploading;

    expect(view.books.map((b) => b.id)).toEqual(['one']);
  });

  it('edits a book and reloads the list', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const editing = view.edit(bookId('one'), { title: 'Blame! 1' });
    at(world.edits, 0).settle(ok(book('one', { title: 'Blame! 1' })));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one', { title: 'Blame! 1' }), book('two')]));
    await editing;

    expect(view.books.map((b) => b.title)).toEqual(['Blame! 1', 'two']);
    expect(view.status).toBe('ready');
    expect(world.notices).toEqual([]);
  });

  it('sets editing while the call runs and clears it afterwards', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const editing = view.edit(bookId('one'), { layoutKind: 'continuous' });
    expect(view.editing).toBe('one');

    at(world.edits, 0).settle(ok(book('one', { layoutKind: 'continuous', direction: 'ltr' })));
    await settleMicrotasks();
    expect(view.editing).toBeNull();

    at(world.lists, 1).settle(ok([book('one'), book('two')]));
    await editing;

    expect(view.editing).toBeNull();
  });

  it('clears editing and reports a message when the repository fails', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const editing = view.edit(bookId('one'), { title: 'Blame! 1' });
    at(world.edits, 0).settle(err({ kind: 'storage-failed', cause: 'the disk went away' }));
    await expect(editing).resolves.toBe('failed');

    expect(view.editing).toBeNull();
    expect(world.notices).toEqual([
      { tone: 'danger', title: EDIT_FAILED, message: 'Local storage failed: the disk went away' },
    ]);
    expect(view.books.map((b) => b.id)).toEqual(['one', 'two']);
    expect(world.lists).toHaveLength(1);
  });

  it('ignores an edit while a removal is running', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const removing = view.remove(bookId('one'));
    await view.edit(bookId('two'), { title: 'Blame! 1' });

    expect(world.edits).toHaveLength(0);
    expect(view.editing).toBeNull();
    expect(view.removing).toBe('one');

    at(world.removes, 0).settle(ok(undefined));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('two')]));
    await removing;

    expect(view.books.map((b) => b.id)).toEqual(['two']);
  });

  it('ignores a removal while an edit is running', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const editing = view.edit(bookId('one'), { title: 'Blame! 1' });
    await view.remove(bookId('two'));

    expect(world.removes).toHaveLength(0);
    expect(view.removing).toBeNull();
    expect(view.editing).toBe('one');

    at(world.edits, 0).settle(ok(book('one', { title: 'Blame! 1' })));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one', { title: 'Blame! 1' }), book('two')]));
    await editing;

    expect(view.books.map((b) => b.title)).toEqual(['Blame! 1', 'two']);
  });

  it('marks a book finished and reloads the list', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const marking = view.markFinished(bookId('one'), 'all');
    expect(world.marks.map((mark) => [mark.kind, mark.id])).toEqual([['finished', 'one']]);
    expect(view.editing).toBe('one');

    at(world.marks, 0).outcome.settle(ok(book('one', { finishedAt: 5 })));
    await settleMicrotasks();
    expect(view.editing).toBeNull();
    at(world.lists, 1).settle(ok([book('one', { finishedAt: 5 }), book('two')]));
    await marking;

    expect(view.books.map((b) => b.finishedAt)).toEqual([5, null]);
    expect(world.notices).toEqual([]);
  });

  it('marks a book unread and reloads the list', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one', { finishedAt: 5 })]));
    await loading;

    const marking = view.markUnread(bookId('one'), 'all');
    expect(world.marks.map((mark) => [mark.kind, mark.id])).toEqual([['unread', 'one']]);
    expect(view.editing).toBe('one');

    at(world.marks, 0).outcome.settle(ok(book('one')));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one')]));
    await marking;

    expect(view.books.map((b) => b.finishedAt)).toEqual([null]);
    expect(view.editing).toBeNull();
  });

  it('reports a failed mark and keeps the books without reloading', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const marking = view.markFinished(bookId('one'), 'all');
    at(world.marks, 0).outcome.settle(err({ kind: 'storage-failed', cause: 'the disk went away' }));
    await expect(marking).resolves.toBeUndefined();

    expect(view.editing).toBeNull();
    expect(world.notices).toEqual([
      { tone: 'danger', title: FINISH_FAILED, message: 'Local storage failed: the disk went away' },
    ]);
    expect(world.lists).toHaveLength(1);
  });

  it('ignores a mark while another change is running', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const editing = view.edit(bookId('one'), { title: 'Blame! 1' });
    void view.markFinished(bookId('two'), 'all');
    void view.markUnread(bookId('two'), 'all');

    expect(world.marks).toHaveLength(0);
    expect(view.editing).toBe('one');

    at(world.edits, 0).settle(ok(book('one', { title: 'Blame! 1' })));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one', { title: 'Blame! 1' }), book('two')]));
    await editing;
  });

  it('ignores a mark while an upload or a removal is running', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two')]));
    await loading;

    const uploading = view.upload([chosen('page.png')], world.open);
    void view.markFinished(bookId('one'), 'all');
    expect(world.marks).toHaveLength(0);
    at(world.opens, 0).settle(err({ kind: 'source', error: { kind: 'empty' } }));
    await uploading;

    const removing = view.remove(bookId('two'));
    void view.markUnread(bookId('one'), 'all');
    at(world.removes, 0).settle(ok(undefined));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one')]));
    await removing;

    expect(world.marks).toHaveLength(0);
  });

  it('reports a failed unread mark once, under its own title', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one', { finishedAt: 5 })]));
    await loading;

    const marking = view.markUnread(bookId('one'), 'all');
    at(world.marks, 0).outcome.settle(err({ kind: 'storage-unavailable' }));
    await marking;

    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: UNREAD_FAILED,
        message: 'This browser blocks local storage, so uploads cannot be kept.',
      },
    ]);
  });

  it('reports an upload that could not be fingerprinted', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const uploading = view.upload([chosen('page.png')], world.open);
    at(world.opens, 0).settle(err({ kind: 'fingerprint', cause: 'no hashing here.' }));
    await uploading;

    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: UPLOAD_FAILED,
        message: 'This page cannot check uploads for duplicates here: no hashing here.',
      },
    ]);
    expect(view.busy).toBe(false);
  });

  it('answers an edit with its outcome, so a failed save can keep the form open', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const failing = view.edit(bookId('one'), { title: 'Blame! 1' });
    at(world.edits, 0).settle(err({ kind: 'storage-failed', cause: 'the disk went away' }));
    expect(await failing).toBe('failed');

    const saving = view.edit(bookId('one'), { title: 'Blame! 1' });
    const skipped = view.edit(bookId('one'), { title: 'Blame! 2' });
    expect(await skipped).toBe('skipped');
    at(world.edits, 1).settle(ok(book('one', { title: 'Blame! 1' })));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one', { title: 'Blame! 1' })]));
    expect(await saving).toBe('changed');
  });

  it('answers a removal with its outcome', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const failing = view.remove(bookId('one'));
    at(world.removes, 0).settle(err({ kind: 'storage-failed', cause: 'the disk went away' }));
    expect(await failing).toBe('failed');

    const removing = view.remove(bookId('one'));
    at(world.removes, 1).settle(ok(undefined));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([]));
    expect(await removing).toBe('changed');
    expect(world.notices.map((notice) => notice.title)).toEqual([REMOVE_FAILED]);
  });
  it('announces an added book with an Open action that opens it', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const uploading = view.upload([chosen('page.png')], world.open);
    at(world.opens, 0).settle(ok({ kind: 'added', book: book('two', { title: 'Blame! 2' }) }));
    await settleMicrotasks();
    at(world.lists, 0).settle(ok([book('two', { title: 'Blame! 2' })]));
    await uploading;

    expect(world.notices).toEqual([
      {
        tone: 'success',
        title: 'Added Blame! 2',
        action: { label: 'Open', run: expect.any(Function) },
        duration: ACTION_NOTICE_MS,
      },
    ]);
    expect(world.opened).toEqual([]);
    at(world.notices, 0).action?.run();
    expect(world.opened).toEqual(['two']);
  });

  it('tells an upload it already holds apart from a new one, and still offers Open', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const uploading = view.upload([chosen('page.png')], world.open);
    at(world.opens, 0).settle(
      ok({ kind: 'already-held', book: book('one', { title: 'Blame! 1' }) }),
    );
    await settleMicrotasks();
    at(world.lists, 0).settle(ok([book('one', { title: 'Blame! 1' })]));
    await uploading;

    expect(world.notices).toEqual([
      {
        tone: 'info',
        title: ALREADY_HELD,
        message: 'Blame! 1',
        action: { label: 'Open', run: expect.any(Function) },
        duration: ACTION_NOTICE_MS,
      },
    ]);
    at(world.notices, 0).action?.run();
    expect(world.opened).toEqual(['one']);
  });

  it('offers Undo when a finished book leaves the shelf, and Undo restores its mark and place', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);
    const reading = book('one', { title: 'Blame! 1', position: imagePlace(imageIndex(40)) });

    const loading = view.load();
    at(world.lists, 0).settle(ok([reading]));
    await loading;

    const marking = view.markFinished(bookId('one'), 'reading');
    at(world.marks, 0).outcome.settle(ok({ ...reading, finishedAt: 5 }));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([{ ...reading, finishedAt: 5 }]));
    await marking;

    expect(world.notices).toEqual([
      {
        tone: 'success',
        title: 'Marked Blame! 1 finished',
        action: { label: 'Undo', run: expect.any(Function) },
        duration: ACTION_NOTICE_MS,
      },
    ]);

    at(world.notices, 0).action?.run();
    expect(world.editCalls).toEqual([
      { id: 'one', edit: { finishedAt: null, position: imagePlace(imageIndex(40)) } },
    ]);
    at(world.edits, 0).settle(ok(reading));
    await settleMicrotasks();
    at(world.lists, 2).settle(ok([reading]));
    await settleMicrotasks();

    expect(view.books.map((b) => b.finishedAt)).toEqual([null]);
    expect(world.notices).toHaveLength(1);
  });

  it('offers Undo when an unread book leaves the finished shelf, restoring its mark and place', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);
    const finished = book('one', { title: 'Blame! 1', finishedAt: 5 });

    const loading = view.load();
    at(world.lists, 0).settle(ok([finished]));
    await loading;

    const marking = view.markUnread(bookId('one'), 'finished');
    at(world.marks, 0).outcome.settle(
      ok({ ...finished, finishedAt: null, position: imagePlace(imageIndex(0)) }),
    );
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([finished]));
    await marking;

    expect(
      world.notices.map((notice) => [notice.tone, notice.title, notice.action?.label]),
    ).toEqual([['success', 'Marked Blame! 1 unread', 'Undo']]);
    at(world.notices, 0).action?.run();
    expect(world.editCalls).toEqual([
      { id: 'one', edit: { finishedAt: 5, position: imagePlace(imageIndex(13)) } },
    ]);
  });

  it('shows no toast for a mark that keeps the book on the shelf', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one'), book('two', { finishedAt: 5 })]));
    await loading;

    const finishing = view.markFinished(bookId('one'), 'all');
    at(world.marks, 0).outcome.settle(ok(book('one', { finishedAt: 5 })));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one', { finishedAt: 5 }), book('two', { finishedAt: 5 })]));
    await finishing;

    const unmarking = view.markUnread(bookId('two'), 'unread');
    at(world.marks, 1).outcome.settle(ok(book('two', { position: imagePlace(imageIndex(0)) })));
    await settleMicrotasks();
    at(world.lists, 2).settle(ok([book('one'), book('two')]));
    await unmarking;

    expect(world.notices).toEqual([]);
  });

  it('shows no toast for a book that was not on the shelf before the mark', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const marking = view.markFinished(bookId('one'), 'unread');
    at(world.marks, 0).outcome.settle(ok(book('one', { finishedAt: 5 })));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one', { finishedAt: 5 })]));
    await marking;

    expect(world.notices).toEqual([]);
  });

  it('reports an Undo whose write fails', async () => {
    const world = fakes();
    const view = new LibraryView(world.container, world.notify);

    const loading = view.load();
    at(world.lists, 0).settle(ok([book('one')]));
    await loading;

    const marking = view.markFinished(bookId('one'), 'reading');
    at(world.marks, 0).outcome.settle(ok(book('one', { finishedAt: 5 })));
    await settleMicrotasks();
    at(world.lists, 1).settle(ok([book('one', { finishedAt: 5 })]));
    await marking;

    at(world.notices, 0).action?.run();
    at(world.edits, 0).settle(err({ kind: 'storage-failed', cause: 'the disk went away' }));
    await settleMicrotasks();

    expect(world.notices.at(-1)).toEqual({
      tone: 'danger',
      title: UNDO_MARK_FAILED,
      message: 'Local storage failed: the disk went away',
    });
  });
});
