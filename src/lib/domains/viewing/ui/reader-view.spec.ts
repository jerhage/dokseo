import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { noTrace } from '$lib/platform/trace/pipeline-trace';
import type { Size } from '$lib/shared/geometry';
import { imageRect } from '$lib/shared/geometry';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type {
  LayoutKind,
  PagePairing,
  PagePairingChoice,
  ReadingDirection,
} from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import type { PagePicture, PageSource } from '$lib/shared/page-source';
import type { ShownPlace } from '$lib/shared/reader-location';
import { imagePlace, showsTheEnd, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import { readingPosition } from '../domain/reading-position';
import type { Notice, Notify } from '$lib/shared/notice';
import { PLACE_FAILED, PLACE_SAVE_DELAY_MS } from '$lib/shared/place-keeper';
import {
  DIRECTION_FAILED,
  FIT_FAILED,
  LANGUAGE_FAILED,
  LAYOUT_FAILED,
  PAIRING_FAILED,
} from './book-preferences.svelte';
import { SOURCE_MISSING, ReaderView } from './reader-view.svelte';
import { heldBook, readingNotice } from './reader-opening';
import type { ReaderBook } from './reader-opening';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/running-write-query'));

const PORTRAIT: Size = { width: 1000, height: 1500 };

const LANDSCAPE: Size = { width: 2400, height: 1600 };

function book(overrides: Partial<ReaderBook> = {}): ReaderBook {
  return {
    id: bookId('one'),
    title: 'Blame!',
    alias: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'double',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 6,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
    ...overrides,
  };
}

function drawnWidth(picture: PagePicture | null): number | null {
  return picture !== null && picture.kind === 'drawn' ? picture.bitmap.width : null;
}

function region(index: number): ImageRegion {
  return { index: imageIndex(index), rect: imageRect(10, 20, 92, 104) };
}

function bitmap(size: Size): ImageBitmap {
  return { width: size.width, height: size.height, close: () => undefined } as ImageBitmap;
}

type FakeSource = {
  readonly source: PageSource;
  readonly asked: number[];
  readonly sizes: Map<number, Size>;
  readonly broken: Set<number>;
  readonly headers: Map<number, Size>;
  headersRead: Promise<void> | null;
  headersFail: boolean;
  kind: 'drawn' | 'encoded';
  held: Promise<void> | null;
  closed: number;
};

function fakeSource(count: number): FakeSource {
  const asked: number[] = [];
  const sizes = new Map<number, Size>();
  const broken = new Set<number>();
  const headers = new Map<number, Size>();

  const state = {
    source: {} as PageSource,
    asked,
    sizes,
    broken,
    headers,
    headersRead: null as Promise<void> | null,
    headersFail: false,
    kind: 'drawn' as 'drawn' | 'encoded',
    held: null as Promise<void> | null,
    closed: 0,
  };

  state.source = {
    count,
    picture: async (index: ImageIndex) => {
      asked.push(index);
      await state.held;
      if (broken.has(index)) {
        return { kind: 'decode-failed', index, cause: 'torn page' } as const;
      }
      if (state.kind === 'encoded') {
        return {
          kind: 'success',
          picture: { kind: 'encoded', url: `blob:page-${index}` },
        } as const;
      }
      return {
        kind: 'success',
        picture: { kind: 'drawn', bitmap: bitmap(sizes.get(index) ?? PORTRAIT) },
      } as const;
    },
    image: (index: ImageIndex) => {
      asked.push(index);
      if (broken.has(index)) {
        return Promise.resolve({ kind: 'decode-failed', index, cause: 'torn page' } as const);
      }
      return Promise.resolve({
        kind: 'success',
        image: bitmap(sizes.get(index) ?? PORTRAIT),
      } as const);
    },
    sizes: async () => {
      const known = new Map(headers);
      await state.headersRead;
      if (state.headersFail) return { kind: 'source-unreadable', cause: 'bad zip' } as const;
      return {
        kind: 'success',
        sizes: Array.from({ length: count }, (_, index) => known.get(index) ?? null),
      } as const;
    },
    close: () => {
      state.closed += 1;
    },
    [Symbol.dispose]: () => {
      state.closed += 1;
    },
  };

  return state;
}

type Edit = {
  readonly id: BookId;
  readonly position: ReadingPlace | undefined;
  readonly layoutKind: LayoutKind | undefined;
  readonly pagePairing: PagePairingChoice | undefined;
  readonly direction: ReadingDirection | undefined;
  readonly pageFit: PageFit | undefined;
  readonly language: Language | undefined;
};

type OpenAnswer = Awaited<ReturnType<Container['library']['openForReading']>>;

type Fakes = {
  readonly container: Container;
  readonly pages: FakeSource;
  readonly edits: Edit[];
  opening: ReaderBook | 'unreadable' | 'missing' | 'no-file' | 'flow';
  editing: 'ok' | 'failed';
  gate: Promise<void> | null;
  stored: ReaderBook;
  readonly notices: Notice[];
  readonly notify: Notify;
};

function fakes(overrides: Partial<ReaderBook> = {}): Fakes {
  const opened = book(overrides);
  const pages = fakeSource(opened.imageCount);
  const edits: Edit[] = [];
  const notices: Notice[] = [];

  const world = {
    pages,
    edits,
    notices,
    notify: (notice: Notice) => {
      notices.push(notice);
    },
    opening: opened as ReaderBook | 'unreadable' | 'missing' | 'no-file' | 'flow',
    editing: 'ok' as 'ok' | 'failed',
    gate: null as Promise<void> | null,
    stored: opened,
    container: {} as Container,
  };

  world.container = {
    beginTrace: noTrace,
    library: {
      openFile: () => Promise.reject(new Error('not used')),
      openForReading: () => {
        if (world.opening === 'missing') {
          return Promise.resolve({ kind: 'not-found', id: bookId('one') } as const);
        }
        if (world.opening === 'no-file') {
          return Promise.resolve({ kind: 'source-missing', id: bookId('one') } as const);
        }
        if (world.opening === 'unreadable') {
          return Promise.resolve({
            kind: 'unreadable',
            failure: { kind: 'source-unreadable', cause: 'bad zip' },
          } as const);
        }
        if (world.opening === 'flow') {
          return Promise.resolve({
            kind: 'flow',
            book: book({ layoutKind: 'flow', imageCount: 0 }),
          } as const);
        }
        return Promise.resolve({
          kind: 'images',
          book: world.opening,
          pages: pages.source,
        } as const);
      },
      listBooks: () => Promise.reject(new Error('not used')),
      readBook: () => Promise.reject(new Error('not used')),
      readCover: () => Promise.reject(new Error('not used')),
      readSource: () => Promise.reject(new Error('not used')),
      removeBook: () => Promise.reject(new Error('not used')),
      listRemovedBooks: () => Promise.reject(new Error('not used')),
      deleteRemovedBookCaptures: () => Promise.reject(new Error('not used')),
      removeBookAndCaptures: () => Promise.reject(new Error('not used')),
      mergeIntoBook: () => Promise.reject(new Error('not used')),
      editBook: async (id, edit) => {
        if (edit.position !== undefined) throw new Error('a place is saved with saveReadingPlace');
        edits.push({
          id,
          position: edit.position,
          layoutKind: edit.layoutKind,
          pagePairing: edit.pagePairing,
          direction: edit.direction,
          pageFit: edit.pageFit,
          language: edit.language,
        });
        if (world.gate !== null) await world.gate;
        if (world.editing === 'failed') return STORAGE_UNAVAILABLE;
        world.stored = {
          ...world.stored,
          layoutKind: edit.layoutKind ?? world.stored.layoutKind,
          pagePairing: edit.pagePairing ?? world.stored.pagePairing,
          direction: edit.direction ?? world.stored.direction,
          pageFit: edit.pageFit ?? world.stored.pageFit,
          language: edit.language ?? world.stored.language,
          position: edit.position ?? world.stored.position,
        };
        return { kind: 'success', book: world.stored };
      },
      saveReadingPlace: async (id, place) => {
        edits.push({
          id,
          position: place,
          layoutKind: undefined,
          pagePairing: undefined,
          direction: undefined,
          pageFit: undefined,
          language: undefined,
        });
        if (world.gate !== null) await world.gate;
        if (world.editing === 'failed') return STORAGE_UNAVAILABLE;
        world.stored = { ...world.stored, position: place };
        return { kind: 'success', book: world.stored };
      },
      markFinished: () => Promise.reject(new Error('not used')),
      markUnread: () => Promise.reject(new Error('not used')),
      readLibrarySize: () => Promise.resolve({ kind: 'success', bytes: 0 }),
      readPageSizes: (source) => source.sizes(),
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
      removeUnreadableCaptures: () => Promise.reject(new Error('not used')),
      clearCaptures: () => Promise.reject(new Error('not used')),
      listTags: () => Promise.reject(new Error('not used')),
      createTag: () => Promise.reject(new Error('not used')),
      addTagToCapture: () => Promise.reject(new Error('not used')),
      removeTagFromCapture: () => Promise.reject(new Error('not used')),
      renameTag: () => Promise.reject(new Error('not used')),
      recolourTag: () => Promise.reject(new Error('not used')),
      deleteTag: () => Promise.reject(new Error('not used')),
      removeUnreadableTags: () => Promise.reject(new Error('not used')),
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

  return world;
}

type Change = (view: ReaderView) => Promise<void>;

type SettingField = keyof Edit & keyof ReaderBook;

describe('ReaderView', () => {
  it('opens a book and exposes its first group', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    expect(view.opening.kind).toBe('idle');

    await view.open(bookId('one'));

    expect(view.opening.kind).toBe('images');
    expect(view.book?.title).toBe('Blame!');
    expect(view.grouping.groups).toHaveLength(3);
    expect(view.navigation.visiblePages).toEqual([0, 1]);
    expect(readingNotice(view.opening)).toBeNull();
  });

  it('reports opening while the book is read', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);

    const opening = view.open(bookId('one'));
    expect(view.opening).toEqual({ kind: 'opening' });
    await opening;

    expect(view.opening.kind).toBe('images');
  });

  it('opens a book that holds no images as empty, and keeps the book', async () => {
    const world = fakes({ imageCount: 0 });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.opening).toEqual({ kind: 'empty', book: book({ imageCount: 0 }) });
    expect(view.book?.title).toBe('Blame!');
  });

  it('discards an open that answers after the reader was disposed, and closes its pages', async () => {
    const world = fakes();
    let answer: (opened: OpenAnswer) => void = () => undefined;
    const late = new Promise<OpenAnswer>((resolve) => {
      answer = resolve;
    });
    const library = world.container.library;
    const container = {
      ...world.container,
      library: { ...library, openForReading: () => late },
    } as Container;
    const view = new ReaderView(container, world.notify);

    const first = view.open(bookId('one'));
    view.dispose();
    answer({ kind: 'images', book: book(), pages: world.pages.source });
    await first;

    expect(view.opening).toEqual({ kind: 'idle' });
    expect(world.pages.closed).toBe(1);
  });

  it('keeps an edited book on the variant it opened as', async () => {
    const world = fakes({ imageCount: 0 });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.preferences.setDirection('ltr');

    expect(view.opening).toMatchObject({ kind: 'empty', book: { direction: 'ltr' } });
  });

  it('lands a failure in the status without throwing', async () => {
    const world = fakes();
    world.opening = 'unreadable';
    const view = new ReaderView(world.container, world.notify);

    await expect(view.open(bookId('one'))).resolves.toBeUndefined();

    expect(view.opening).toEqual({
      kind: 'failed',
      message: 'That book could not be read: bad zip',
    });
    expect(view.book).toBeNull();
    expect(view.grouping.groups).toEqual([]);
  });

  it('moves to the next group and back', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.next();
    expect(view.navigation.group).toBe(1);
    expect(view.navigation.visiblePages).toEqual([2, 3]);

    await view.navigation.previous();
    expect(view.navigation.group).toBe(0);
    expect(view.navigation.visiblePages).toEqual([0, 1]);
  });

  it('offers the groups on either side of the current one, and none past either end', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    expect(view.navigation.besidePages).toEqual({ decrement: null, increment: [2, 3] });

    await view.navigation.next();
    expect(view.navigation.besidePages).toEqual({ decrement: [0, 1], increment: [4, 5] });

    await view.navigation.next();
    expect(view.navigation.besidePages).toEqual({ decrement: [2, 3], increment: null });
  });

  it('refuses to move past either end', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.previous();
    expect(view.navigation.group).toBe(0);

    await view.navigation.goToGroup(2);
    await view.navigation.next();

    expect(view.navigation.group).toBe(2);
    expect(view.navigation.visiblePages).toEqual([4, 5]);
    expect(world.edits.map((edit) => edit.position)).toEqual([
      imagePlace(imageIndex(4), imageIndex(5)),
    ]);
  });

  it('closes the page source on dispose', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    expect(world.pages.closed).toBe(0);

    view.dispose();

    expect(world.pages.closed).toBe(1);
    expect(view.opening.kind).toBe('idle');
    expect(view.book).toBeNull();
  });

  it('records a measured size and regroups', async () => {
    const world = fakes();
    world.pages.sizes.set(0, LANDSCAPE);
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    expect(view.grouping.groups).toHaveLength(3);

    const drawn = await view.pictureAt(imageIndex(0));

    expect(drawnWidth(drawn)).toBe(2400);
    expect(at(view.grouping.sizes, 0)).toEqual(LANDSCAPE);
    expect(view.grouping.groups).toEqual([[0], [1, 2], [3, 4], [5]]);
  });

  it('keeps the reader on the same image when a discovered wide page re-phases the groups', async () => {
    const world = fakes({ position: imagePlace(imageIndex(3)) });
    world.pages.sizes.set(2, LANDSCAPE);
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    expect(view.navigation.group).toBe(1);

    await view.pictureAt(imageIndex(2));

    expect(view.navigation.position.index).toBe(3);
    expect(view.navigation.group).toBe(2);
    expect(view.navigation.visiblePages).toEqual([3, 4]);
  });

  it('persists the position when the group changes', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    expect(world.edits).toHaveLength(0);

    await view.navigation.next();

    expect(world.edits).toEqual([
      { id: 'one', position: imagePlace(imageIndex(2), imageIndex(3)) },
    ]);
  });

  it('reports a page that will not decode without failing the book', async () => {
    const world = fakes();
    world.pages.broken.add(1);
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    const drawn = await view.pictureAt(imageIndex(1));

    expect(drawn).toBeNull();
    expect(view.opening.kind).toBe('images');
    expect(readingNotice(view.opening)).toBeNull();
  });

  it('hands the display an encoded picture and measures nothing', async () => {
    const world = fakes();
    world.pages.kind = 'encoded';
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    const shown = await view.pictureAt(imageIndex(0));

    expect(shown).toEqual({ kind: 'encoded', url: 'blob:page-0' });
    expect(at(view.grouping.sizes, 0)).toBeNull();
  });

  it('releases an encoded picture that arrives after the reader has moved on', async () => {
    const revoked: string[] = [];
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation((url: string) => void revoked.push(url));
    const world = fakes();
    world.pages.kind = 'encoded';
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    let arrive = (): void => undefined;
    world.pages.held = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const pending = view.pictureAt(imageIndex(0));
    view.dispose();
    arrive();

    await expect(pending).resolves.toBeNull();
    expect(revoked).toEqual(['blob:page-0']);
    revoke.mockRestore();
  });

  it('pairs from the sizes read at open, before any page is shown', async () => {
    const world = fakes();
    world.pages.headers.set(0, LANDSCAPE);
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));
    await vi.waitFor(() => expect(at(view.grouping.sizes, 0)).toEqual(LANDSCAPE));

    expect(view.grouping.groups).toEqual([[0], [1, 2], [3, 4], [5]]);
    expect(world.pages.asked).toEqual([]);
  });

  it('keeps a size the display measured over the one read at open', async () => {
    const world = fakes();
    world.pages.headers.set(0, PORTRAIT);
    let arrive = (): void => undefined;
    world.pages.headersRead = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.grouping.measure(imageIndex(0), LANDSCAPE);
    arrive();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(at(view.grouping.sizes, 0)).toEqual(LANDSCAPE);
  });

  it('lets a later measurement replace a size read at open', async () => {
    const world = fakes();
    world.pages.headers.set(0, PORTRAIT);
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    await vi.waitFor(() => expect(at(view.grouping.sizes, 0)).toEqual(PORTRAIT));

    view.grouping.measure(imageIndex(0), LANDSCAPE);

    expect(at(view.grouping.sizes, 0)).toEqual(LANDSCAPE);
    expect(view.grouping.groups).toEqual([[0], [1, 2], [3, 4], [5]]);
  });

  it('drops sizes read for a book the reader has already left', async () => {
    const world = fakes();
    world.pages.headers.set(0, LANDSCAPE);
    let arrive = (): void => undefined;
    world.pages.headersRead = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    world.pages.headersRead = null;
    world.pages.headers.clear();
    await view.open(bookId('one'));
    arrive();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(at(view.grouping.sizes, 0)).toBeNull();
  });

  it('keeps the assumed sizes when they cannot be read at open', async () => {
    const world = fakes();
    world.pages.headers.set(0, LANDSCAPE);
    world.pages.headersFail = true;
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(at(view.grouping.sizes, 0)).toBeNull();
    expect(view.opening.kind).toBe('images');
    expect(world.notices).toEqual([]);
  });

  it('sets the pairing and rebuilds the groups', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    expect(view.grouping.groups).toHaveLength(3);

    await view.preferences.setPairing('single');

    expect(view.book?.pagePairing).toBe('single');
    expect(view.grouping.groups).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(at(world.edits, 0).pagePairing).toBe('single');
    expect(view.preferences.saving).toBe(false);
  });

  it('shows an automatic book one page at a time on a narrow screen and two after the cover on a wide one', async () => {
    const world = fakes({ pagePairing: 'auto' });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    const wide = view.grouping.groups;

    view.grouping.fitScreen('narrow');
    const narrow = view.grouping.groups;
    view.grouping.fitScreen('wide');

    expect(wide).toEqual([[0], [1, 2], [3, 4], [5]]);
    expect(narrow).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(view.grouping.groups).toEqual(wide);
    expect(world.edits).toEqual([]);
  });

  it('opens an automatic book one page at a time when the screen was already narrow', async () => {
    const world = fakes({ pagePairing: 'auto' });
    const view = new ReaderView(world.container, world.notify);
    view.grouping.fitScreen('narrow');

    await view.open(bookId('one'));

    expect(view.grouping.groups).toEqual([[0], [1], [2], [3], [4], [5]]);
  });

  it('keeps a chosen pairing on a narrow screen', async () => {
    const world = fakes({ pagePairing: 'double-after-cover' });
    const view = new ReaderView(world.container, world.notify);
    view.grouping.fitScreen('narrow');

    await view.open(bookId('one'));
    const chosen = view.grouping.groups;
    await view.preferences.setPairing('double');

    expect(chosen).toEqual([[0], [1, 2], [3, 4], [5]]);
    expect(view.grouping.groups).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('groups a strip one image at a time whatever pairing the book stores', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'double', direction: 'rtl' });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.grouping.groups).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(view.direction).toBe('ltr');
    expect(view.book?.pagePairing).toBe('double');
  });

  const SAME_IMAGE: readonly (readonly [
    string,
    Partial<ReaderBook>,
    Change,
    number,
    readonly number[],
    number,
    readonly number[],
  ])[] = [
    [
      'the pairing changes',
      { position: imagePlace(imageIndex(3)) },
      (view) => view.preferences.setPairing('double-after-cover'),
      1,
      [2, 3],
      2,
      [3, 4],
    ],
    [
      'the layout changes',
      { position: imagePlace(imageIndex(3)) },
      (view) => view.preferences.setLayoutKind('continuous'),
      1,
      [2, 3],
      3,
      [3],
    ],
    [
      'the layout returns to pages',
      { layoutKind: 'continuous', position: imagePlace(imageIndex(3)) },
      (view) => view.preferences.setLayoutKind('paged'),
      3,
      [3],
      1,
      [2, 3],
    ],
  ];

  it.each(SAME_IMAGE)(
    'keeps the reader on the same image when %s',
    async (_change, overrides, change, groupBefore, shownBefore, groupAfter, shownAfter) => {
      const world = fakes(overrides);
      const view = new ReaderView(world.container, world.notify);
      await view.open(bookId('one'));
      expect(view.navigation.group).toBe(groupBefore);
      expect(view.navigation.visiblePages).toEqual(shownBefore);

      await change(view);

      expect(view.navigation.position.index).toBe(3);
      expect(view.navigation.group).toBe(groupAfter);
      expect(view.navigation.visiblePages).toEqual(shownAfter);
    },
  );

  it('sets the layout kind and regroups the strip one image at a time', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    expect(view.grouping.groups).toHaveLength(3);

    await view.preferences.setLayoutKind('continuous');

    expect(view.book?.layoutKind).toBe('continuous');
    expect(view.book?.pagePairing).toBe('double');
    expect(view.grouping.groups).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(at(world.edits, 0).layoutKind).toBe('continuous');
    expect(view.preferences.saving).toBe(false);
  });

  it('clears the selection when the layout changes', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    view.selection.select([region(0)]);

    await view.preferences.setLayoutKind('continuous');

    expect(view.selection.regions).toEqual([]);
  });

  const IN_FORCE: readonly (readonly [string, Change])[] = [
    ['layout', (view) => view.preferences.setLayoutKind('paged')],
    ['language', (view) => view.preferences.setLanguage('ja')],
    ['pairing', (view) => view.preferences.setPairing('double')],
    ['direction', (view) => view.preferences.setDirection('rtl')],
    ['page fit', (view) => view.preferences.setPageFit('height')],
  ];

  it.each(IN_FORCE)('ignores a %s already in force', async (_setting, change) => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await change(view);

    expect(world.edits).toEqual([]);
  });

  const IN_FLIGHT: readonly (readonly [string, Change, SettingField, unknown])[] = [
    ['layout', (view) => view.preferences.setLayoutKind('continuous'), 'layoutKind', 'paged'],
    ['language', (view) => view.preferences.setLanguage('ko'), 'language', 'ja'],
    ['direction', (view) => view.preferences.setDirection('ltr'), 'direction', 'rtl'],
  ];

  it.each(IN_FLIGHT)(
    'ignores a %s change while another write is in flight',
    async (_setting, change, field, kept) => {
      const world = fakes();
      const view = new ReaderView(world.container, world.notify);
      await view.open(bookId('one'));

      let release = (): void => undefined;
      world.gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      const first = view.preferences.setPairing('single');
      await change(view);
      expect(world.edits).toHaveLength(1);

      release();
      await first;

      expect(world.edits).toHaveLength(1);
      expect(view.book?.pagePairing).toBe('single');
      expect(view.book?.[field]).toBe(kept);
    },
  );

  const SETS: readonly (readonly [string, Change, SettingField, unknown])[] = [
    ['the direction', (view) => view.preferences.setDirection('ltr'), 'direction', 'ltr'],
    ['a new language', (view) => view.preferences.setLanguage('ko'), 'language', 'ko'],
    ['the page fit', (view) => view.preferences.setPageFit('width'), 'pageFit', 'width'],
  ];

  it.each(SETS)('saves %s', async (_setting, change, field, value) => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await change(view);

    expect(view.book?.[field]).toBe(value);
    expect(at(world.edits, 0)[field]).toBe(value);
    expect(readingNotice(view.opening)).toBeNull();
  });

  it('clears the saving flag on dispose while a setting is still saving', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    world.gate = new Promise<void>(() => undefined);

    void view.preferences.setDirection('ltr');
    expect(view.preferences.saving).toBe(true);
    view.dispose();

    expect(view.preferences.saving).toBe(false);
  });

  it('keeps a setting that answers after another book opened off the book now shown', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    let release = (): void => undefined;
    world.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const changing = view.preferences.setLanguage('ko');
    await view.open(bookId('one'));
    release();
    await changing;

    expect(view.book?.language).toBe('ja');
  });

  it('reports nothing for a failed setting that answers after another book opened', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    let release = (): void => undefined;
    world.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    world.editing = 'failed';

    const changing = view.preferences.setDirection('ltr');
    await view.open(bookId('one'));
    release();
    await changing;

    expect(world.notices).toEqual([]);
  });

  const FAILURES: readonly (readonly [string, Change, string, SettingField, unknown])[] = [
    [
      'layout',
      (view) => view.preferences.setLayoutKind('continuous'),
      LAYOUT_FAILED,
      'layoutKind',
      'paged',
    ],
    [
      'pairing',
      (view) => view.preferences.setPairing('single'),
      PAIRING_FAILED,
      'pagePairing',
      'double',
    ],
    [
      'direction',
      (view) => view.preferences.setDirection('ltr'),
      DIRECTION_FAILED,
      'direction',
      'rtl',
    ],
    ['language', (view) => view.preferences.setLanguage('en'), LANGUAGE_FAILED, 'language', 'ja'],
    ['page fit', (view) => view.preferences.setPageFit('width'), FIT_FAILED, 'pageFit', 'height'],
  ];

  it.each(FAILURES)(
    'reports a failed %s change under its own title and leaves the book unchanged',
    async (_setting, change, title, field, kept) => {
      const world = fakes();
      world.editing = 'failed';
      const view = new ReaderView(world.container, world.notify);
      await view.open(bookId('one'));

      await expect(change(view)).resolves.toBeUndefined();

      expect(world.notices).toEqual([
        {
          tone: 'danger',
          title,
          message: 'This browser blocks local storage, so your place cannot be kept.',
        },
      ]);
      expect(readingNotice(view.opening)).toBeNull();
      expect(view.book?.[field]).toBe(kept);
      expect(view.grouping.groups).toHaveLength(3);
      expect(view.preferences.saving).toBe(false);
    },
  );

  it('keeps the selection when the page fit changes', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    view.selection.select([region(0)]);

    await view.preferences.setPageFit('width');

    expect(view.selection.regions).toEqual([region(0)]);
  });

  it('saves the page fit even while another write is in flight', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    let release = (): void => undefined;
    world.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = view.preferences.setPairing('single');
    const second = view.preferences.setPageFit('width');

    release();
    await Promise.all([first, second]);

    expect(world.edits).toHaveLength(2);
    expect(at(world.edits, 1).pageFit).toBe('width');
  });

  it('reports a failed save of the reading position', async () => {
    const world = fakes();
    world.editing = 'failed';
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.next();

    expect(view.navigation.group).toBe(1);
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: PLACE_FAILED,
        message: 'This browser blocks local storage, so your place cannot be kept.',
      },
    ]);
    expect(readingNotice(view.opening)).toBeNull();
  });

  it('tells the book changed once a setting is saved', async () => {
    const world = fakes();
    let changed = 0;
    const view = new ReaderView(world.container, world.notify, null, null, () => {
      changed += 1;
    });
    await view.open(bookId('one'));

    await view.preferences.setDirection('ltr');

    expect(changed).toBe(1);
  });

  it('tells the book changed once a place is saved', async () => {
    const world = fakes();
    let changed = 0;
    const view = new ReaderView(world.container, world.notify, null, null, () => {
      changed += 1;
    });
    await view.open(bookId('one'));

    await view.navigation.next();

    expect(changed).toBe(1);
  });

  it('tells nothing when a save fails', async () => {
    const world = fakes();
    world.editing = 'failed';
    let changed = 0;
    const view = new ReaderView(world.container, world.notify, null, null, () => {
      changed += 1;
    });
    await view.open(bookId('one'));

    await view.navigation.next();
    await view.preferences.setDirection('ltr');

    expect(changed).toBe(0);
  });

  it('ignores a failed place save that answers after another book opened', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    let release: () => void = () => undefined;
    world.gate = new Promise((resolve) => {
      release = resolve;
    });
    world.editing = 'failed';

    const turning = view.navigation.next();
    await view.open(bookId('one'));
    release();
    await turning;

    expect(world.edits.map((edit) => edit.position?.kind)).toContain('image');
    expect(world.notices).toEqual([]);
  });

  it('clears the regions when the group changes', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    view.selection.select([region(0)]);

    await view.navigation.next();

    expect(view.navigation.group).toBe(1);
    expect(view.selection.regions).toEqual([]);
  });

  it('clears the regions on dispose', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    view.selection.select([region(0)]);
    expect(view.selection.regions).toHaveLength(1);

    view.dispose();

    expect(view.selection.regions).toEqual([]);
  });
});

describe('the reading place of a continuous strip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds a new place at once without saving it', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', direction: 'ltr' });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.navigation.moveTo(readingPosition(imageIndex(3), 0.5));

    expect(view.navigation.position).toEqual({ index: 3, offset: 0.5 });
    expect(world.edits).toEqual([]);
  });

  it('saves only the last place once the scrolling settles', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', direction: 'ltr' });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.navigation.moveTo(readingPosition(imageIndex(1), 0.25));
    view.navigation.moveTo(readingPosition(imageIndex(2), 0.75));
    view.navigation.moveTo(readingPosition(imageIndex(4), 0));

    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits.map((edit) => edit.position)).toEqual([imagePlace(imageIndex(4))]);
  });

  it('saves a place still waiting when the reader leaves', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', direction: 'ltr' });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    view.navigation.moveTo(readingPosition(imageIndex(5), 0.5));
    expect(world.edits).toEqual([]);

    view.dispose();
    await vi.advanceTimersByTimeAsync(0);

    expect(world.edits.map((edit) => edit.position)).toEqual([
      imagePlace(imageIndex(5), imageIndex(5), 0.5),
    ]);
  });

  it('saves a move within the slice it already holds once the scrolling settles', async () => {
    const world = fakes({
      layoutKind: 'continuous',
      pagePairing: 'single',
      direction: 'ltr',
      position: imagePlace(imageIndex(2), imageIndex(2), 0.25),
    });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.navigation.moveTo(readingPosition(imageIndex(2), 0.4), imageIndex(2));
    view.navigation.moveTo(readingPosition(imageIndex(2), 0.5), imageIndex(2));
    expect(world.edits).toEqual([]);
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits.map((edit) => edit.position)).toEqual([
      imagePlace(imageIndex(2), imageIndex(2), 0.5),
    ]);
  });

  it('opens at the fraction down the slice the reader left', async () => {
    const world = fakes({
      layoutKind: 'continuous',
      pagePairing: 'single',
      direction: 'ltr',
      position: imagePlace(imageIndex(3), imageIndex(3), 0.4),
    });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.navigation.position).toEqual({ index: 3, offset: 0.4 });
  });

  it('opens at the top of a slice the url names that is not the one the reader left', async () => {
    const world = fakes({
      layoutKind: 'continuous',
      pagePairing: 'single',
      direction: 'ltr',
      position: imagePlace(imageIndex(3), imageIndex(3), 0.4),
    });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'), imageIndex(1));

    expect(view.navigation.position).toEqual({ index: 1, offset: 0 });
  });

  it('saves nothing when the strip reports the fraction it opened at', async () => {
    const world = fakes({
      layoutKind: 'continuous',
      pagePairing: 'single',
      direction: 'ltr',
      position: imagePlace(imageIndex(3), imageIndex(3), 0.4),
    });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.navigation.moveTo(readingPosition(imageIndex(3), 0.4), imageIndex(3));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits).toEqual([]);
  });

  it('saves nothing for a move to the place it already holds', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', direction: 'ltr' });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.navigation.moveTo(readingPosition(imageIndex(0), 0));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits).toEqual([]);
  });
});

describe('reading to the end', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function stopAt(world: Fakes, groupsBeforeTheEnd: number): Promise<ReaderView> {
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    await view.navigation.goToGroup(view.grouping.groups.length - 1 - groupsBeforeTheEnd);
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);
    return view;
  }

  const books: readonly (readonly [PagePairing, number])[] = [
    ['double-after-cover', 5],
    ['double-after-cover', 6],
    ['double', 6],
    ['double', 5],
    ['single', 5],
  ];

  for (const [pairing, count] of books) {
    it(`saves a place showing the end once ${pairing} shows the last of ${count} pages`, async () => {
      const world = fakes({ pagePairing: pairing, imageCount: count });

      await stopAt(world, 0);

      expect(showsTheEnd(world.stored.position, count)).toBe(true);
    });

    it(`saves a place short of the end while ${pairing} shows the group before the last of ${count} pages`, async () => {
      const world = fakes({ pagePairing: pairing, imageCount: count });

      await stopAt(world, 1);

      expect(showsTheEnd(world.stored.position, count)).toBe(false);
    });
  }

  it('saves the first page of the last spread as the place to reopen at', async () => {
    const world = fakes({ pagePairing: 'double-after-cover', imageCount: 5 });

    await stopAt(world, 0);

    expect(world.stored.position).toEqual(imagePlace(imageIndex(3), imageIndex(4)));
  });

  it('reopens a book read to its last spread at that spread, not past it', async () => {
    const world = fakes({
      pagePairing: 'double-after-cover',
      imageCount: 5,
      position: imagePlace(imageIndex(3), imageIndex(4)),
    });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.navigation.position.index).toBe(3);
    expect(view.navigation.visiblePages).toEqual([3, 4]);
    expect(world.edits).toEqual([]);
  });

  it('saves the only page of a one-image book as read once it shows it', async () => {
    const world = fakes({ imageCount: 1 });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(world.edits.map((edit) => edit.position)).toEqual([imagePlace(imageIndex(0))]);
  });

  it('saves both pages of a two-page double book as read once it shows the spread', async () => {
    const world = fakes({ imageCount: 2 });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(world.edits.map((edit) => edit.position)).toEqual([
      imagePlace(imageIndex(0), imageIndex(1)),
    ]);
    expect(showsTheEnd(world.stored.position, 2)).toBe(true);
  });

  it('saves nothing on reopening a one-image book a reader already saved', async () => {
    const world = fakes({ imageCount: 1, lastReadAt: 1758300000000 });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(world.edits).toEqual([]);
  });

  it('saves nothing on opening a book whose first group is not its last', async () => {
    const world = fakes({ imageCount: 3 });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits).toEqual([]);
  });

  it('saves nothing on opening a one-image strip, which records reading by its scroll', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', imageCount: 1 });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(world.edits).toEqual([]);
  });

  it('saves the smaller group at once when a wide page splits the spread it shows', async () => {
    const world = fakes({ position: imagePlace(imageIndex(2), imageIndex(3)) });
    world.pages.sizes.set(3, LANDSCAPE);
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.pictureAt(imageIndex(3));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(view.navigation.visiblePages).toEqual([2]);
    expect(world.stored.position).toEqual(imagePlace(imageIndex(2)));
  });

  it('finishes a book at once when a pairing change brings its last page into view', async () => {
    const world = fakes({ pagePairing: 'single', position: imagePlace(imageIndex(4)) });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.preferences.setPairing('double');
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.stored.position).toEqual(imagePlace(imageIndex(4), imageIndex(5)));
    expect(showsTheEnd(world.stored.position, 6)).toBe(true);
  });

  it('corrects a turn still waiting to save when the groups change under it', async () => {
    const world = fakes();
    world.pages.sizes.set(3, LANDSCAPE);
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));
    await view.navigation.next();

    await view.pictureAt(imageIndex(3));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.stored.position).toEqual(imagePlace(imageIndex(2)));
  });

  it('takes back the end of a two-page book when its second page turns out wide', async () => {
    const world = fakes({ imageCount: 2 });
    world.pages.headers.set(1, LANDSCAPE);
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(view.grouping.groups).toEqual([[0], [1]]);
    expect(world.stored.position).toEqual(imagePlace(imageIndex(0)));
  });

  it('saves nothing when a regroup changes the first group of a book nobody has read', async () => {
    const world = fakes({ pagePairing: 'single' });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.preferences.setPairing('double');
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits.filter((edit) => edit.position !== undefined)).toEqual([]);
  });

  it('saves a place showing the end once a strip shows its short last image', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', imageCount: 5 });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.navigation.moveTo(readingPosition(imageIndex(3), 0.6), imageIndex(4));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.stored.position).toEqual(imagePlace(imageIndex(3), imageIndex(4), 0.6));
    expect(showsTheEnd(world.stored.position, 5)).toBe(true);
  });

  it('saves a place short of the end while a strip has not yet shown its last image', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', imageCount: 5 });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    view.navigation.moveTo(readingPosition(imageIndex(3), 0.4), imageIndex(3));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(showsTheEnd(world.stored.position, 5)).toBe(false);
  });
});

describe('the reading place in the url', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens at the index the url asked for', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'), imageIndex(4));

    expect(view.navigation.position.index).toBe(4);
    expect(view.navigation.visiblePages).toEqual([4, 5]);
  });

  it('overwrites the saved place with the one the url asked for', async () => {
    const world = fakes({ position: imagePlace(imageIndex(2)) });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'), imageIndex(4));

    expect(world.edits.map((edit) => edit.position)).toEqual([
      imagePlace(imageIndex(4), imageIndex(5)),
    ]);
  });

  it('keeps a saved text place when the url asks for an image', async () => {
    const world = fakes({ position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', null) });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'), imageIndex(4));

    expect(view.navigation.position.index).toBe(4);
    expect(world.edits).toEqual([]);
  });

  it('mirrors no image and saves nothing when the book stopped at a text place', async () => {
    const world = fakes({ position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', null) });
    const mirrored: ShownPlace[] = [];
    const view = new ReaderView(world.container, world.notify, (place) => mirrored.push(place));

    await view.open(bookId('one'));

    expect(mirrored).toEqual([]);
    expect(world.edits).toEqual([]);
    expect(readingNotice(view.opening)).toBeNull();
  });

  it('keeps the saved place when the url asks for nothing', async () => {
    const world = fakes({ position: imagePlace(imageIndex(2)) });
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.navigation.position.index).toBe(2);
    expect(world.edits).toEqual([]);
  });

  it('clamps a url index past the end and says what it did', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'), imageIndex(99));

    expect(view.navigation.position.index).toBe(5);
    expect(readingNotice(view.opening)).toBe(
      'This book holds 6 images, so it opened at the last one.',
    );
  });

  const ARRIVALS: readonly (readonly [string, number, readonly number[]])[] = [
    ['at the start of a spread', 4, [4, 5]],
    ['inside a spread', 3, [2, 3]],
  ];

  it.each(ARRIVALS)(
    'reports the place it opened at to its mirror as an arrival %s, at the image the url named',
    async (_where, named, shown) => {
      const world = fakes();
      const mirrored: ShownPlace[] = [];
      const view = new ReaderView(world.container, world.notify, (place) => mirrored.push(place));

      await view.open(bookId('one'), imageIndex(named));

      expect(view.navigation.visiblePages).toEqual(shown);
      expect(mirrored).toEqual([{ kind: 'arrived', index: named }]);
    },
  );

  it('mirrors a page turn once the turning settles, without saving twice', async () => {
    const world = fakes();
    const mirrored: ShownPlace[] = [];
    const view = new ReaderView(world.container, world.notify, (place) => mirrored.push(place));
    await view.open(bookId('one'));
    mirrored.length = 0;

    await view.navigation.next();
    await view.navigation.next();
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(mirrored).toEqual([{ kind: 'moved', index: 4, group: [4, 5] }]);
    expect(world.edits.map((edit) => edit.position)).toEqual([
      imagePlace(imageIndex(2), imageIndex(3)),
      imagePlace(imageIndex(4), imageIndex(5)),
    ]);
  });

  it('reports a jump into a spread as a move that shows the whole spread', async () => {
    const world = fakes();
    const mirrored: ShownPlace[] = [];
    const view = new ReaderView(world.container, world.notify, (place) => mirrored.push(place));
    await view.open(bookId('one'));
    mirrored.length = 0;

    await view.navigation.goToImage(bookId('one'), imageIndex(3));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(mirrored).toEqual([{ kind: 'moved', index: 2, group: [2, 3] }]);
  });

  it('reports a scroll along a continuous strip as a move', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single' });
    const mirrored: ShownPlace[] = [];
    const view = new ReaderView(world.container, world.notify, (place) => mirrored.push(place));
    await view.open(bookId('one'));
    mirrored.length = 0;

    view.navigation.moveTo(readingPosition(imageIndex(3), 0.4), imageIndex(4));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(mirrored).toEqual([{ kind: 'moved', index: 3, group: [3] }]);
  });

  it('moves to the group holding the image the url asked for', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.goToImage(bookId('one'), imageIndex(4));

    expect(view.navigation.position.index).toBe(4);
    expect(view.navigation.visiblePages).toEqual([4, 5]);
  });

  it('clamps a jump past the end to the last image', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.goToImage(bookId('one'), imageIndex(99));

    expect(view.navigation.position.index).toBe(4);
  });

  it('holds the place a jump asked for in a continuous book', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single' });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.goToImage(bookId('one'), imageIndex(3));

    expect(view.navigation.position.index).toBe(3);
  });

  it('ignores a jump aimed at a book it is not showing', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.goToImage(bookId('another'), imageIndex(4));

    expect(view.navigation.position.index).toBe(0);
  });

  it('saves nothing for a jump to the place it already holds', async () => {
    const world = fakes();
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.navigation.goToImage(bookId('one'), imageIndex(0));

    expect(world.edits).toEqual([]);
  });

  it('names a flow book as its own state, keeping the flow book and holding no book and no page source', async () => {
    const world = fakes();
    world.opening = 'flow';
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.opening).toEqual({
      kind: 'flow',
      book: book({ layoutKind: 'flow', imageCount: 0 }),
    });
    expect(view.book).toBeNull();
    expect(view.source).toBeNull();
    expect(view.layout).toBeNull();
  });

  it('asks a flow book for no picture', async () => {
    const world = fakes();
    world.opening = 'flow';
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    const picture = await view.pictureAt(imageIndex(0));

    expect(picture).toBeNull();
    expect(world.pages.asked).toEqual([]);
  });

  it('saves a new language for a flow book into the flow book', async () => {
    const world = fakes();
    world.opening = 'flow';
    world.stored = book({ layoutKind: 'flow', imageCount: 0 });
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    await view.preferences.setLanguage('ko');

    expect(at(world.edits, 0).language).toBe('ko');
    expect(heldBook(view.opening)?.language).toBe('ko');
    expect(view.book).toBeNull();
    expect(view.language).toBe('ko');
  });

  const LANGUAGES: readonly (readonly [string, (world: Fakes) => boolean, Language | null])[] = [
    [
      'reads the language of an open flow book',
      (world) => {
        world.opening = 'flow';
        return true;
      },
      'ja',
    ],
    [
      'reads the language of an open book of images',
      (world) => {
        world.opening = book({ language: 'ko' });
        return true;
      },
      'ko',
    ],
    ['reports no language with no book open', () => false, null],
  ];

  it.each(LANGUAGES)('%s', async (_case, arrange, language) => {
    const world = fakes();
    const opens = arrange(world);
    const view = new ReaderView(world.container, world.notify);

    if (opens) await view.open(bookId('one'));

    expect(view.language).toBe(language);
  });

  it('forgets the flow book when a book of images opens next', async () => {
    const world = fakes();
    world.opening = 'flow';
    const view = new ReaderView(world.container, world.notify);
    await view.open(bookId('one'));

    world.opening = world.stored;
    await view.open(bookId('one'));

    expect(view.opening.kind).toBe('images');
  });

  it('reports a book that is no longer in the library as missing', async () => {
    const world = fakes();
    world.opening = 'missing';
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.opening).toEqual({
      kind: 'missing',
      message: 'That book is no longer in your library.',
    });
  });

  it('reports a book whose file is gone as failed, not as missing', async () => {
    const world = fakes();
    world.opening = 'no-file';
    const view = new ReaderView(world.container, world.notify);

    await view.open(bookId('one'));

    expect(view.opening).toEqual({ kind: 'failed', message: SOURCE_MISSING });
  });
});

describe('ReaderView language hook', () => {
  type Known = { readonly book: BookId; readonly language: Language };

  function watched(world: Fakes): { view: ReaderView; known: Known[] } {
    const known: Known[] = [];
    const view = new ReaderView(world.container, world.notify, null, (opened, language) =>
      known.push({ book: opened, language }),
    );
    return { view, known };
  }

  it('reports the language once an image book opens', async () => {
    const { view, known } = watched(fakes());

    await view.open(bookId('one'));

    expect(known).toEqual([{ book: bookId('one'), language: 'ja' }]);
  });

  it('reports a language the reader chooses', async () => {
    const { view, known } = watched(fakes());
    await view.open(bookId('one'));

    await view.preferences.setLanguage('ko');

    expect(known).toEqual([
      { book: bookId('one'), language: 'ja' },
      { book: bookId('one'), language: 'ko' },
    ]);
  });

  it('reports nothing for an edit that keeps the language', async () => {
    const { view, known } = watched(fakes());
    await view.open(bookId('one'));

    await view.preferences.setPairing('single');

    expect(known).toHaveLength(1);
  });

  it('reports nothing for a failed language change', async () => {
    const world = fakes();
    world.editing = 'failed';
    const { view, known } = watched(world);
    await view.open(bookId('one'));

    await view.preferences.setLanguage('en');

    expect(known).toHaveLength(1);
  });

  const NO_LANGUAGE: readonly (readonly [string, Fakes['opening']])[] = [
    ['flowing', 'flow'],
    ['missing', 'missing'],
  ];

  it.each(NO_LANGUAGE)('reports no language for a %s book', async (_kind, opening) => {
    const world = fakes();
    world.opening = opening;
    const { view, known } = watched(world);

    await view.open(bookId('one'));

    expect(known).toEqual([]);
  });

  it('reports again when the same book opens afresh', async () => {
    const { view, known } = watched(fakes());
    await view.open(bookId('one'));
    view.dispose();

    await view.open(bookId('one'));

    expect(known).toHaveLength(2);
  });
});
