import { describe, expect, it } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Notice, Notify } from '$lib/shared/notice';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { taggedCapture } from '../../domain/tag/capture-tags';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError } from '../../domain/tag/tag-repository';
import { recognizedText } from '../../domain/engine/recognized-text';
import { arrivalFrom, passageFrom } from './capture-arrivals';
import { CaptureView } from './capture-view.svelte';
import type { Settled } from './panel-capture';

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
      listCaptures: (book: BookId): Promise<Result<readonly Capture[], CaptureError>> =>
        Promise.resolve(ok(store.rows.filter((row) => row.bookId === book))),
      listEveryCapture: (): Promise<Result<readonly Capture[], CaptureError>> =>
        Promise.resolve(ok([...store.rows])),
      saveCapture: (draft: CaptureDraft): Promise<Result<Capture, CaptureError>> => {
        const kept = takenCapture(draft, store.rows.length + 1);
        store.rows = [...store.rows, kept];
        return Promise.resolve(ok(kept));
      },
      writeNote: (
        id: CaptureId,
        book: BookId,
        taken: Anchor,
      ): Promise<Result<Capture, CaptureError>> => {
        const note = takenCapture(
          { id, bookId: book, anchor: taken, text: '', origin: 'written' },
          store.rows.length + 1,
        );
        store.rows = [...store.rows, note];
        return Promise.resolve(ok(note));
      },
      editCaptureText: unused,
      writeCaptureNote: unused,
      removeCapture: unused,
      restoreCapture: unused,
      clearCaptures: (book: BookId): Promise<Result<void, CaptureError>> => {
        store.rows = store.rows.filter((row) => row.bookId !== book);
        return Promise.resolve(ok(undefined));
      },
      listTags: (): Promise<Result<readonly Tag[], TagError>> => Promise.resolve(ok(store.tags)),
      createTag: unused,
      addTagToCapture: (capture: Capture, tag: TagId): Promise<Result<Capture, CaptureError>> => {
        const tagged = taggedCapture(capture, tag);
        store.rows = store.rows.map((row) => (row.id === tagged.id ? tagged : row));
        return Promise.resolve(ok(tagged));
      },
      removeTagFromCapture: unused,
      renameTag: unused,
      recolourTag: unused,
      deleteTag: unused,
      readModelStorage: unused,
      deleteModel: unused,
      readRecognizerSetup: unused,
      saveRecognizerSetup: unused,
      detectCompute: unused,
      prepareRecognizer: unused,
      pauseModelLoad: unused,
      cancelModelLoad: unused,
      closeRecognizer: unused,
    },
    flowing: {
      readReadingSettings: unused,
      saveReadingSettings: unused,
    },
    storage: {
      readStorageAccount: unused,
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

const CROWN = tagId('tag-crown');

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

function settles(settled: Settled): () => Promise<Settled> {
  return () => Promise.resolve(settled);
}

describe('CaptureView parts', () => {
  it('lists the stored captures of the book it opens oldest first', async () => {
    const world = fakes();
    world.store.rows = [storedRow('two', ONE, '後', 2), storedRow('one', ONE, '先', 1)];
    world.store.rows.push(storedRow('other', TWO, '別', 3));
    const view = new CaptureView(world.container, world.notify);

    await view.list.open(ONE);

    expect(panelTexts(view)).toEqual(['先', '後']);
  });

  it('settles the pending card the recognition returns and stores the text', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

    await view.recording.recognizing(
      regions(),
      settles({ status: 'done', text: recognizedText('読', null), edited: false }),
    );

    expect(panelTexts(view)).toEqual(['読']);
    expect(world.store.rows.map((row) => row.text)).toEqual(['読']);
  });

  it('stores nothing for a recognition that read no text', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

    await view.recording.recognizing(regions(), settles({ status: 'empty' }));

    expect(panelTexts(view)).toEqual(['empty']);
    expect(world.store.rows).toEqual([]);
  });

  it('stores nothing for a note when no book is open', () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    view.recording.note(regions());

    expect(view.list.captures).toEqual([]);
    expect(world.steps.map((step) => step.detail.guard)).toEqual(['no-open-book']);
  });

  it('puts a tag on the capture, on its card and in the library counts', async () => {
    const world = fakes();
    world.store.rows = [storedRow('one', ONE, '先', 1)];
    world.store.tags = [namedTag(CROWN, 'crown', 'slate', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);
    await view.tagging.loadTagCounts();

    await view.tagging.addTag(captureId('one'), CROWN);

    expect(view.list.captures.map((capture) => capture.tagIds)).toEqual([[CROWN]]);
    expect(view.tagging.libraryCounts.get(CROWN)).toBe(1);
    expect(view.tagging.bookCounts.get(CROWN)).toBe(1);
  });

  it('empties the list and the store of the open book when it is cleared', async () => {
    const world = fakes();
    world.store.rows = [storedRow('one', ONE, '先', 1), storedRow('other', TWO, '別', 2)];
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

    await view.clearAll.clear();

    expect(view.list.captures).toEqual([]);
    expect(view.list.count).toBe(0);
    expect(world.store.rows.map((row) => row.id)).toEqual([captureId('other')]);
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
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

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
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

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
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

    expect(
      arrivalFrom(view.list.read, { kind: 'passage', cfi: CFI, query: null }, 'rtl', byCfi),
    ).toBeNull();
    expect(arrivalFrom(view.list.read, { kind: 'none' }, 'rtl', byCfi)).toBeNull();
  });

  it('seeks the cfi a url names, with the quote of the passage lifted there', async () => {
    const world = fakes();
    world.store.rows = [lifted('here', CFI)];
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

    expect(passageFrom(view.list.anchors, { kind: 'passage', cfi: CFI, query: '灯' })).toEqual({
      cfi: CFI,
      quote: QUOTE,
    });
  });

  it('seeks the cfi a url names even when no capture was lifted there', async () => {
    const world = fakes();
    world.store.rows = [lifted('elsewhere', 'epubcfi(/6/2)')];
    const view = new CaptureView(world.container, world.notify);
    await view.list.open(ONE);

    expect(passageFrom(view.list.anchors, { kind: 'passage', cfi: CFI, query: null })).toEqual({
      cfi: CFI,
      quote: null,
    });
  });

  it('seeks no passage for a url naming an image', () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

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
