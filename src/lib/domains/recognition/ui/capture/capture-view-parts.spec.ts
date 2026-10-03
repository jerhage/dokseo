import { describe, expect, it, vi } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Notice, Notify } from '$lib/shared/notice';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import { taggedCapture } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import { recognizedText } from '../../domain/engine/recognized-text';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { arrivalFrom, passageFrom } from './capture-arrivals';
import { READ } from './capture-read';
import { CaptureView } from './capture-view.svelte';
import type { Settled } from './panel-capture';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/unrun-write-query'));

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

type Step = {
  readonly label: string;
  readonly name: string;
  readonly detail: Record<string, unknown>;
};

type Store = {
  rows: Capture[];
  tags: readonly Tag[];
};

type Fakes = {
  readonly container: Container;
  readonly store: Store;
  readonly steps: Step[];
  readonly notices: Notice[];
  readonly notify: Notify;
};

function unused(): never {
  throw new Error('The capture parts do not use this');
}

function fakes(): Fakes {
  const store: Store = { rows: [], tags: [] };
  const steps: Step[] = [];

  const container: Container = {
    beginTrace: (label: string): Trace => ({
      step: (name: string, detail: Record<string, unknown>): void => {
        steps.push({ label, name, detail });
      },
      image: (): void => undefined,
      end: (): void => undefined,
    }),
    library: {
      openFile: unused,
      openForReading: unused,
      listBooks: unused,
      readBook: unused,
      readCover: unused,
      readSource: unused,
      removeBook: unused,
      listRemovedBooks: unused,
      deleteRemovedBookCaptures: unused,
      removeBookAndCaptures: unused,
      mergeIntoBook: unused,
      exportBookCaptures: unused,
      editBook: unused,
      saveReadingPlace: unused,
      markFinished: unused,
      markUnread: unused,
      readLibrarySize: unused,
      readPageSizes: unused,
    },
    recognition: {
      readModelConsent: unused,
      grantModelConsent: unused,
      recognizeRegion: unused,
      listCaptures: (book: BookId) =>
        Promise.resolve({
          kind: 'success',
          captures: store.rows.filter((row) => row.bookId === book),
          unreadable: [],
        }),
      listEveryCapture: () =>
        Promise.resolve({ kind: 'success', captures: [...store.rows], unreadable: [] }),
      saveCapture: (draft: CaptureDraft) => {
        const kept = takenCapture(draft, store.rows.length + 1);
        store.rows = [...store.rows, kept];
        return Promise.resolve({ kind: 'success', capture: kept });
      },
      writeNote: (id: CaptureId, book: BookId, taken: Anchor) => {
        const note = takenCapture(
          { id, bookId: book, anchor: taken, text: '', origin: 'written' },
          store.rows.length + 1,
        );
        store.rows = [...store.rows, note];
        return Promise.resolve({ kind: 'success', capture: note });
      },
      editCaptureText: unused,
      writeCaptureNote: unused,
      removeCapture: unused,
      restoreCapture: unused,
      removeUnreadableCaptures: unused,
      clearCaptures: (book: BookId) => {
        store.rows = store.rows.filter((row) => row.bookId !== book);
        return Promise.resolve({ kind: 'success' });
      },
      listTags: () => Promise.resolve({ kind: 'success', tags: store.tags, unreadable: [] }),
      createTag: unused,
      addTagToCapture: (capture: Capture, tag: TagId) => {
        const tagged = taggedCapture(capture, tag);
        store.rows = store.rows.map((row) => (row.id === tagged.id ? tagged : row));
        return Promise.resolve({ kind: 'success', capture: tagged });
      },
      removeTagFromCapture: unused,
      renameTag: unused,
      recolourTag: unused,
      deleteTag: unused,
      removeUnreadableTags: unused,
      readModelStorage: unused,
      deleteModel: unused,
      readRecognizerSetup: unused,
      saveRecognizerSetup: unused,
      detectCompute: unused,
      prepareRecognizer: unused,
      pauseModelLoad: unused,
      cancelModelLoad: unused,
      exportBookCaptures: () => Promise.resolve({ kind: 'nothing-to-export' }),
      closeRecognizer: unused,
    },
    flowing: {
      readReadingSettings: unused,
      saveReadingSettings: unused,
    },
    storage: {
      readStorageAccount: unused,
      exportCaptures: unused,
      previewCapturesImport: unused,
      applyCapturesImport: unused,
    },
  };

  const notices: Notice[] = [];

  return {
    container,
    store,
    steps,
    notices,
    notify: (notice) => {
      notices.push(notice);
    },
  };
}

const ONE = bookId('book-one');

const TWO = bookId('book-two');

function regions(index = 13): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: imageRect(0, 0, 40, 20) }];
}

function storedRow(id: string, book: BookId, text: string, createdAt: number): Capture {
  return {
    id: captureId(id),
    bookId: book,
    anchor: regionAnchor(regions(4)),
    text,
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function panelTexts(view: CaptureView): readonly string[] {
  return view.list.captures.map((capture) =>
    capture.status === 'done' ? capture.text.text : capture.status,
  );
}

function viewOf(world: Fakes): CaptureView {
  const view: CaptureView = new CaptureView(
    world.container,
    world.notify,
    createTestQueryClient(),
    () => ({
      state: READ,
      captures: world.store.rows.filter((row) => row.bookId === view.list.book),
      tags: world.store.tags,
      unreadable: [],
      reload: () => undefined,
    }),
    () => undefined,
  );
  return view;
}

function settles(settled: Settled): () => Promise<Settled> {
  return () => Promise.resolve(settled);
}

describe('CaptureView parts', () => {
  it('lists the stored captures of the book it opens oldest first', async () => {
    const world = fakes();
    world.store.rows = [storedRow('two', ONE, '後', 2), storedRow('one', ONE, '先', 1)];
    world.store.rows.push(storedRow('other', TWO, '別', 3));
    const view = viewOf(world);

    view.list.open(ONE);

    expect(panelTexts(view)).toEqual(['先', '後']);
  });

  it('settles the pending card the recognition returns', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.list.open(ONE);

    await view.recording.recognizing(
      regions(),
      settles({ status: 'done', text: recognizedText('読', null), edited: false }),
    );

    expect(panelTexts(view)).toEqual(['読']);
  });

  it('stores nothing for a note when no book is open', () => {
    const world = fakes();
    const view = viewOf(world);

    view.recording.note(regions());

    expect(view.list.captures).toEqual([]);
    expect(world.steps.map((step) => step.detail.guard)).toEqual(['no-open-book']);
  });
});

describe('CaptureView arrivals', () => {
  const CFI = 'epubcfi(/6/4!/4/2,/1:0,/1:2)';
  const QUOTE = { exact: '灯台', prefix: '', suffix: '' };

  function lifted(id: string, cfi: string): Capture {
    return {
      id: captureId(id),
      bookId: ONE,
      anchor: textAnchor(cfi, QUOTE, null),
      text: '灯台',
      note: null,
      origin: 'lifted',
      createdAt: 5,
      editedAt: null,
      tagIds: [],
    };
  }

  function storedAt(id: string, x: number): Capture {
    return {
      ...storedRow(id, ONE, id, 1),
      anchor: regionAnchor([{ index: imageIndex(4), rect: imageRect(x, 12.5, 40, 20) }]),
    };
  }

  it('arrives at only the stored capture at the image and region a url names', async () => {
    const world = fakes();
    world.store.rows = [storedAt('one', 100.333), storedAt('two', 10.666)];
    const view = viewOf(world);
    view.list.open(ONE);

    const arrival = arrivalFrom(
      view.list.read,
      { kind: 'image', index: imageIndex(4), region: imageRect(10.67, 12.5, 40, 20), query: null },
      'rtl',
      byCfi,
    );

    expect(arrival?.at.id).toBe(captureId('two'));
  });

  it('arrives at no capture for a url naming an image without a region', async () => {
    const world = fakes();
    world.store.rows = [storedAt('one', 100), storedAt('two', 10)];
    const view = viewOf(world);
    view.list.open(ONE);

    expect(
      arrivalFrom(
        view.list.read,
        { kind: 'image', index: imageIndex(4), region: null, query: null },
        'rtl',
        byCfi,
      ),
    ).toBeNull();
    expect(
      arrivalFrom(
        view.list.read,
        { kind: 'image', index: imageIndex(4), region: null, query: '1' },
        'rtl',
        byCfi,
      ),
    ).toBeNull();
  });

  it('arrives at no capture for a url naming a passage or nothing', async () => {
    const world = fakes();
    world.store.rows = [storedRow('one', ONE, '先', 1)];
    const view = viewOf(world);
    view.list.open(ONE);

    expect(
      arrivalFrom(view.list.read, { kind: 'passage', cfi: CFI, query: null }, 'rtl', byCfi),
    ).toBeNull();
    expect(arrivalFrom(view.list.read, { kind: 'none' }, 'rtl', byCfi)).toBeNull();
  });

  it('seeks the cfi a url names, with the quote of the passage lifted there', async () => {
    const world = fakes();
    world.store.rows = [lifted('here', CFI)];
    const view = viewOf(world);
    view.list.open(ONE);

    expect(passageFrom(view.list.anchors, { kind: 'passage', cfi: CFI, query: '灯' })).toEqual({
      cfi: CFI,
      quote: QUOTE,
    });
  });

  it('seeks the cfi a url names even when no capture was lifted there', async () => {
    const world = fakes();
    world.store.rows = [lifted('elsewhere', 'epubcfi(/6/2)')];
    const view = viewOf(world);
    view.list.open(ONE);

    expect(passageFrom(view.list.anchors, { kind: 'passage', cfi: CFI, query: null })).toEqual({
      cfi: CFI,
      quote: null,
    });
  });

  it('seeks no passage for a url naming an image', () => {
    const world = fakes();
    const view = viewOf(world);

    expect(
      passageFrom(view.list.anchors, {
        kind: 'image',
        index: imageIndex(0),
        region: null,
        query: null,
      }),
    ).toBeNull();
  });
});
