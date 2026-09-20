import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { noTrace } from '$lib/platform/trace/pipeline-trace';
import type { Size } from '$lib/shared/geometry';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex, type BookId, type ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import type { PageSource } from '$lib/shared/page-source';
import { err, ok } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { readingPosition } from '../domain/reading-position';
import { PLACE_SAVE_DELAY_MS, ReaderView, type ReaderBook } from './reader-view.svelte';

const PORTRAIT: Size = { width: 1000, height: 1500 };

const LANDSCAPE: Size = { width: 2400, height: 1600 };

function book(overrides: Partial<ReaderBook> = {}): ReaderBook {
  return {
    id: bookId('one'),
    title: 'Blame!',
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'double',
    pageFit: 'height',
    sourceKind: 'archive',
    imageCount: 6,
    addedAt: 1758240000000,
    position: imageIndex(0),
    ...overrides,
  };
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
  closed: number;
};

function fakeSource(count: number): FakeSource {
  const asked: number[] = [];
  const sizes = new Map<number, Size>();
  const broken = new Set<number>();

  const state = {
    source: {} as PageSource,
    asked,
    sizes,
    broken,
    closed: 0,
  };

  state.source = {
    count,
    image: (index: ImageIndex) => {
      asked.push(index);
      if (broken.has(index)) {
        return Promise.resolve(err({ kind: 'decode-failed', index, cause: 'torn page' } as const));
      }
      return Promise.resolve(ok(bitmap(sizes.get(index) ?? PORTRAIT)));
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
  readonly position: number | undefined;
  readonly pagePairing: PagePairing | undefined;
  readonly direction: ReadingDirection | undefined;
  readonly pageFit: PageFit | undefined;
};

type Fakes = {
  readonly container: Container;
  readonly pages: FakeSource;
  readonly edits: Edit[];
  opening: ReaderBook | 'unreadable' | 'missing';
  editing: 'ok' | 'failed';
  gate: Promise<void> | null;
  stored: ReaderBook;
};

function fakes(overrides: Partial<ReaderBook> = {}): Fakes {
  const opened = book(overrides);
  const pages = fakeSource(opened.imageCount);
  const edits: Edit[] = [];

  const world = {
    pages,
    edits,
    opening: opened as ReaderBook | 'unreadable' | 'missing',
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
          return Promise.resolve(
            err({ kind: 'library', error: { kind: 'not-found', id: bookId('one') } } as const),
          );
        }
        if (world.opening === 'unreadable') {
          return Promise.resolve(
            err({
              kind: 'source',
              error: { kind: 'source-unreadable', cause: 'bad zip' },
            } as const),
          );
        }
        return Promise.resolve(ok({ book: world.opening, pages: pages.source }));
      },
      listBooks: () => Promise.reject(new Error('not used')),
      readCover: () => Promise.reject(new Error('not used')),
      removeBook: () => Promise.reject(new Error('not used')),
      editBook: async (id, edit) => {
        edits.push({
          id,
          position: edit.position,
          pagePairing: edit.pagePairing,
          direction: edit.direction,
          pageFit: edit.pageFit,
        });
        if (world.gate !== null) await world.gate;
        if (world.editing === 'failed') {
          return err({ kind: 'storage-failed', cause: 'the disk went away' });
        }
        world.stored = {
          ...world.stored,
          pagePairing: edit.pagePairing ?? world.stored.pagePairing,
          direction: edit.direction ?? world.stored.direction,
          pageFit: edit.pageFit ?? world.stored.pageFit,
          position: edit.position ?? world.stored.position,
        };
        return ok(world.stored);
      },
      readLibrarySize: () => Promise.resolve(ok(0)),
    },
    recognition: {
      readModelConsent: () => Promise.reject(new Error('not used')),
      grantModelConsent: () => Promise.reject(new Error('not used')),
      recognizeRegion: () => Promise.reject(new Error('not used')),
      listCaptures: () => Promise.reject(new Error('not used')),
      listEveryCapture: () => Promise.reject(new Error('not used')),
      saveCapture: () => Promise.reject(new Error('not used')),
      editCaptureText: () => Promise.reject(new Error('not used')),
      removeCapture: () => Promise.reject(new Error('not used')),
      clearCaptures: () => Promise.reject(new Error('not used')),
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
    storage: {
      readStorageAccount: () => Promise.reject(new Error('not used')),
    },
  };

  return world;
}

describe('ReaderView', () => {
  it('opens a book and exposes its first group', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    expect(view.status).toBe('idle');

    await view.open(bookId('one'));

    expect(view.status).toBe('ready');
    expect(view.book?.title).toBe('Blame!');
    expect(view.groups).toHaveLength(3);
    expect(view.visiblePages).toEqual([0, 1]);
    expect(view.message).toBeNull();
  });

  it('lands a failure in the status without throwing', async () => {
    const world = fakes();
    world.opening = 'unreadable';
    const view = new ReaderView(world.container);

    await expect(view.open(bookId('one'))).resolves.toBeUndefined();

    expect(view.status).toBe('failed');
    expect(view.message).toBe('That book could not be read: bad zip');
    expect(view.book).toBeNull();
    expect(view.groups).toEqual([]);
  });

  it('moves to the next group and back', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.next();
    expect(view.group).toBe(1);
    expect(view.visiblePages).toEqual([2, 3]);

    await view.previous();
    expect(view.group).toBe(0);
    expect(view.visiblePages).toEqual([0, 1]);
  });

  it('refuses to move past either end', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.previous();
    expect(view.group).toBe(0);

    await view.goToGroup(2);
    await view.next();

    expect(view.group).toBe(2);
    expect(view.visiblePages).toEqual([4, 5]);
    expect(world.edits.map((edit) => edit.position)).toEqual([4]);
  });

  it('closes the page source on dispose', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    expect(world.pages.closed).toBe(0);

    view.dispose();

    expect(world.pages.closed).toBe(1);
    expect(view.status).toBe('idle');
    expect(view.book).toBeNull();
  });

  it('records a measured size and regroups', async () => {
    const world = fakes();
    world.pages.sizes.set(0, LANDSCAPE);
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    expect(view.groups).toHaveLength(3);

    const drawn = await view.imageAt(imageIndex(0));

    expect(drawn?.width).toBe(2400);
    expect(at(view.sizes, 0)).toEqual(LANDSCAPE);
    expect(view.groups).toEqual([[0], [1, 2], [3, 4], [5]]);
  });

  it('keeps the reader on the same image when a discovered wide page re-phases the groups', async () => {
    const world = fakes({ position: imageIndex(3) });
    world.pages.sizes.set(2, LANDSCAPE);
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    expect(view.group).toBe(1);

    await view.imageAt(imageIndex(2));

    expect(view.position.index).toBe(3);
    expect(view.group).toBe(2);
    expect(view.visiblePages).toEqual([3, 4]);
  });

  it('persists the position when the group changes', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    expect(world.edits).toHaveLength(0);

    await view.next();

    expect(world.edits).toEqual([{ id: 'one', position: 2 }]);
  });

  it('reports a page that will not decode without failing the book', async () => {
    const world = fakes();
    world.pages.broken.add(1);
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    const drawn = await view.imageAt(imageIndex(1));

    expect(drawn).toBeNull();
    expect(view.status).toBe('ready');
    expect(view.message).toBeNull();
  });

  it('sets the pairing and rebuilds the groups', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    expect(view.groups).toHaveLength(3);

    await view.setPairing('single');

    expect(view.book?.pagePairing).toBe('single');
    expect(view.groups).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(at(world.edits, 0).pagePairing).toBe('single');
    expect(view.saving).toBe(false);
  });

  it('groups a strip one image at a time whatever pairing the book stores', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'double', direction: 'rtl' });
    const view = new ReaderView(world.container);

    await view.open(bookId('one'));

    expect(view.groups).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(view.direction).toBe('ltr');
    expect(view.book?.pagePairing).toBe('double');
  });

  it('keeps the reader on the same image when the pairing changes', async () => {
    const world = fakes({ position: imageIndex(3) });
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    expect(view.group).toBe(1);
    expect(view.visiblePages).toEqual([2, 3]);

    await view.setPairing('double-after-cover');

    expect(view.position.index).toBe(3);
    expect(view.group).toBe(2);
    expect(view.visiblePages).toEqual([3, 4]);
  });

  it('sets the direction', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.setDirection('ltr');

    expect(view.book?.direction).toBe('ltr');
    expect(at(world.edits, 0).direction).toBe('ltr');
    expect(view.message).toBeNull();
  });

  it('sets the page fit', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.setPageFit('width');

    expect(view.book?.pageFit).toBe('width');
    expect(at(world.edits, 0).pageFit).toBe('width');
    expect(view.message).toBeNull();
  });

  it('keeps the selection when the page fit changes', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    view.select([region(0)]);

    await view.setPageFit('width');

    expect(view.regions).toEqual([region(0)]);
  });

  it('saves the page fit even while another write is in flight', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    let release = (): void => undefined;
    world.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = view.setPairing('single');
    const second = view.setPageFit('width');

    release();
    await Promise.all([first, second]);

    expect(world.edits).toHaveLength(2);
    expect(at(world.edits, 1).pageFit).toBe('width');
  });

  it('ignores a setting already in force', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.setPairing('double');
    await view.setDirection('rtl');
    await view.setPageFit('height');

    expect(world.edits).toEqual([]);
  });

  it('reports a failed setting and leaves the book unchanged', async () => {
    const world = fakes();
    world.editing = 'failed';
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await expect(view.setPairing('single')).resolves.toBeUndefined();

    expect(view.message).toBe('Local storage failed: the disk went away');
    expect(view.book?.pagePairing).toBe('double');
    expect(view.groups).toHaveLength(3);
    expect(view.saving).toBe(false);
  });

  it('ignores a second setting while a write is in flight', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    let release = (): void => undefined;
    world.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = view.setPairing('single');
    await view.setDirection('ltr');
    expect(world.edits).toHaveLength(1);

    release();
    await first;

    expect(world.edits).toHaveLength(1);
    expect(view.book?.pagePairing).toBe('single');
    expect(view.book?.direction).toBe('rtl');
  });

  it('reports a failed save of the reading position', async () => {
    const world = fakes();
    world.editing = 'failed';
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.next();

    expect(view.group).toBe(1);
    expect(view.message).toBe('Local storage failed: the disk went away');
  });

  it('holds the regions it is given', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    expect(view.regions).toEqual([]);

    view.select([region(0), region(1)]);

    expect(view.regions).toEqual([region(0), region(1)]);
  });

  it('clears the regions when the group changes', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    view.select([region(0)]);

    await view.next();

    expect(view.group).toBe(1);
    expect(view.regions).toEqual([]);
  });

  it('clears the regions on dispose', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    view.select([region(0)]);
    expect(view.regions).toHaveLength(1);

    view.dispose();

    expect(view.regions).toEqual([]);
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
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    view.moveTo(readingPosition(imageIndex(3), 0.5));

    expect(view.position).toEqual({ index: 3, offset: 0.5 });
    expect(world.edits).toEqual([]);
  });

  it('saves only the last place once the scrolling settles', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', direction: 'ltr' });
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    view.moveTo(readingPosition(imageIndex(1), 0.25));
    view.moveTo(readingPosition(imageIndex(2), 0.75));
    view.moveTo(readingPosition(imageIndex(4), 0));

    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits.map((edit) => edit.position)).toEqual([4]);
  });

  it('saves a place still waiting when the reader leaves', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', direction: 'ltr' });
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));
    view.moveTo(readingPosition(imageIndex(5), 0.5));
    expect(world.edits).toEqual([]);

    view.dispose();

    expect(world.edits.map((edit) => edit.position)).toEqual([5]);
  });

  it('saves nothing for a move to the place it already holds', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single', direction: 'ltr' });
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    view.moveTo(readingPosition(imageIndex(0), 0));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits).toEqual([]);
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
    const view = new ReaderView(world.container);

    await view.open(bookId('one'), imageIndex(4));

    expect(view.position.index).toBe(4);
    expect(view.visiblePages).toEqual([4, 5]);
  });

  it('overwrites the saved place with the one the url asked for', async () => {
    const world = fakes({ position: imageIndex(2) });
    const view = new ReaderView(world.container);

    await view.open(bookId('one'), imageIndex(4));

    expect(world.edits.map((edit) => edit.position)).toEqual([4]);
  });

  it('keeps the saved place when the url asks for nothing', async () => {
    const world = fakes({ position: imageIndex(2) });
    const view = new ReaderView(world.container);

    await view.open(bookId('one'));

    expect(view.position.index).toBe(2);
    expect(world.edits).toEqual([]);
  });

  it('clamps a url index past the end and says what it did', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);

    await view.open(bookId('one'), imageIndex(99));

    expect(view.position.index).toBe(5);
    expect(view.message).toBe('This book holds 6 images, so it opened at the last one.');
  });

  it('reports the place it opened at to its mirror', async () => {
    const world = fakes();
    const mirrored: number[] = [];
    const view = new ReaderView(world.container, (index) => mirrored.push(index));

    await view.open(bookId('one'), imageIndex(4));

    expect(mirrored).toEqual([4]);
  });

  it('mirrors a page turn once the turning settles, without saving twice', async () => {
    const world = fakes();
    const mirrored: number[] = [];
    const view = new ReaderView(world.container, (index) => mirrored.push(index));
    await view.open(bookId('one'));
    mirrored.length = 0;

    await view.next();
    await view.next();
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(mirrored).toEqual([4]);
    expect(world.edits.map((edit) => edit.position)).toEqual([2, 4]);
  });

  it('moves to the group holding the image the url asked for', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.goToImage(bookId('one'), imageIndex(4));

    expect(view.position.index).toBe(4);
    expect(view.visiblePages).toEqual([4, 5]);
  });

  it('clamps a jump past the end to the last image', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.goToImage(bookId('one'), imageIndex(99));

    expect(view.position.index).toBe(4);
  });

  it('holds the place a jump asked for in a continuous book', async () => {
    const world = fakes({ layoutKind: 'continuous', pagePairing: 'single' });
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.goToImage(bookId('one'), imageIndex(3));

    expect(view.position.index).toBe(3);
  });

  it('ignores a jump aimed at a book it is not showing', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.goToImage(bookId('another'), imageIndex(4));

    expect(view.position.index).toBe(0);
  });

  it('saves nothing for a jump to the place it already holds', async () => {
    const world = fakes();
    const view = new ReaderView(world.container);
    await view.open(bookId('one'));

    await view.goToImage(bookId('one'), imageIndex(0));

    expect(world.edits).toEqual([]);
  });

  it('reports a book that is no longer in the library as missing', async () => {
    const world = fakes();
    world.opening = 'missing';
    const view = new ReaderView(world.container);

    await view.open(bookId('one'));

    expect(view.status).toBe('missing');
    expect(view.message).toBe('That book is no longer in your library.');
  });
});
