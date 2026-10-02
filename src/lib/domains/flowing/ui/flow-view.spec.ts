import type { TocItem } from 'foliate-js/view.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import type { SoughtPassage, TextAnchor, TextQuote } from '$lib/shared/anchor';
import { bookId, contentHash } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { BookId } from '$lib/shared/ids';
import { START_OF_THE_TEXT, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { Notice, Notify } from '$lib/shared/notice';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { DEFAULT_READING_SETTINGS } from '../domain/reading-settings';
import type { ReadingSettings } from '../domain/reading-settings';
import type { ContentsEntry } from './flow-contents';
import {
  arrivedAtTheCfi,
  foundByItsText,
  MOVED_SINCE_IT_WAS_CAPTURED,
  NOT_IN_THE_BOOK_ANY_MORE,
  THE_PASSAGE_IS_LOST,
} from './flow-quote';
import { NOTHING_ARRIVED_AT } from './flow-highlight';
import type { PassageMark } from './flow-highlight';
import { REFLOWED, TRAVELLED } from './flow-move';
import type { FlowRelocation } from './flow-move';
import type { BookPaging } from './flow-writing-mode';
import type { PassageArrival } from './flow-quote';
import { INK_FOR_THE_DARK_PAGE } from './flow-styles';
import type { PageInk } from './flow-styles';
import type { FlowOpening, FlowSurface } from './flow-surface';
import { PLACE_FAILED, PLACE_SAVE_DELAY_MS } from '$lib/shared/place-keeper';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { FlowView, SOURCE_MISSING } from './flow-view.svelte';
import type { FlowBook, ShowFlowBook } from './flow-view.svelte';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/running-write-query'));

const NOVEL: BookId = bookId('one');

const SOURCE = new Blob(['PK'], { type: 'application/epub+zip' });

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

const FURTHER_ON = 'epubcfi(/6/16!/4/2/2/1:0)';

const LATER_STILL = 'epubcfi(/6/18!/4/2/8/1:0)';

type Reads = Awaited<ReturnType<Container['library']['readSource']>>;

type Edits = Awaited<ReturnType<Container['library']['editBook']>>;

type Keeps = Awaited<ReturnType<Container['flowing']['saveReadingSettings']>>;

type BookEdit = Parameters<Container['library']['editBook']>[1];

function novel(position: ReadingPlace): FlowBook {
  return {
    id: NOVEL,
    title: 'Kokoro',
    alias: null,
    language: 'ja',
    layoutKind: 'flow',
    direction: 'rtl',
    pagePairing: 'double-after-cover',
    pageFit: 'width',
    sourceKind: 'epub',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 0,
    addedAt: 1758240000000,
    position,
    lastReadAt: null,
    finishedAt: null,
  };
}

type Shelf = {
  container: Container;
  readonly edits: BookEdit[];
  readonly reads: BookId[];
  readonly chosen: ReadingSettings[];
  place: ReadingPlace;
  stored: ReadingSettings;
  keep: () => Promise<Keeps>;
  read: () => Promise<Reads>;
  save: () => Promise<Edits>;
  readonly notices: Notice[];
  readonly notify: Notify;
};

const IGNORED: Notify = () => undefined;

const NO_CONTAINER = {} as unknown as Container;

function shelf(): Shelf {
  const notices: Notice[] = [];
  const world: Shelf = {
    notices,
    notify: (notice) => {
      notices.push(notice);
    },
    container: NO_CONTAINER,
    edits: [],
    reads: [],
    chosen: [],
    place: START_OF_THE_TEXT,
    stored: DEFAULT_READING_SETTINGS,
    keep: () => Promise.resolve({ kind: 'success' }),
    read: () => Promise.resolve({ kind: 'success', source: SOURCE }),
    save: () => Promise.resolve({ kind: 'success', book: novel(world.place) }),
  };

  world.container = {
    flowing: {
      saveReadingSettings: (settings: ReadingSettings) => {
        world.chosen.push(settings);
        return world.keep();
      },
    },
    library: {
      readSource: (id: BookId) => {
        world.reads.push(id);
        return world.read();
      },
      saveReadingPlace: (_id: BookId, place: ReadingPlace) => {
        world.edits.push({ position: place });
        return world.save();
      },
    },
  } as unknown as Container;

  return world;
}

async function settled(): Promise<void> {
  for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
}

function held(): { readonly promise: Promise<void>; readonly release: () => void } {
  let release = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

type Shown = {
  readonly show: ShowFlowBook;
  readonly openings: FlowOpening[];
  readonly destroyed: number[];
  readonly turned: string[];
  readonly sought: number[];
  readonly jumped: string[];
  readonly restyled: ReadingSettings[];
  readonly inked: PageInk[];
  readonly passages: SoughtPassage[];
  readonly marked: (readonly string[])[];
  readonly arrivals: PassageMark[];
  arrival: PassageArrival;
  toc: readonly TocItem[] | null;
  ticks: readonly number[];
  gate: Promise<void> | null;
  failure: string | null;
  direction: ReadingDirection;
  paging: BookPaging;
};

function shows(): Shown {
  const openings: FlowOpening[] = [];
  const destroyed: number[] = [];
  const turned: string[] = [];
  const sought: number[] = [];
  const jumped: string[] = [];
  const restyled: ReadingSettings[] = [];
  const inked: PageInk[] = [];
  const passages: SoughtPassage[] = [];
  const marked: (readonly string[])[] = [];
  const arrivals: PassageMark[] = [];

  const world = {
    openings,
    destroyed,
    turned,
    sought,
    jumped,
    restyled,
    inked,
    passages,
    marked,
    arrivals,
    arrival: arrivedAtTheCfi(SOMEWHERE) as PassageArrival,
    toc: null as readonly TocItem[] | null,
    ticks: [] as readonly number[],
    gate: null as Promise<void> | null,
    failure: null as string | null,
    direction: 'ltr' as ReadingDirection,
    paging: { axis: 'horizontal', direction: 'ltr' } as BookPaging,
    show: (() => Promise.reject(new Error('not built'))) as ShowFlowBook,
  };

  world.show = async (opening: FlowOpening): Promise<FlowSurface> => {
    openings.push(opening);
    const which = openings.length - 1;
    if (world.gate !== null) await world.gate;
    if (world.failure !== null) throw new Error(world.failure);
    return {
      direction: world.direction,
      paging: world.paging,
      pages: {
        goLeft: () => turned.push('goLeft'),
        goRight: () => turned.push('goRight'),
        prev: () => turned.push('prev'),
        next: () => turned.push('next'),
      },
      toc: world.toc,
      ticks: world.ticks,
      seek: (fraction: number) => {
        sought.push(fraction);
      },
      jump: (href: string) => {
        jumped.push(href);
      },
      mark: (asked: readonly string[], arrived: PassageMark) => {
        marked.push(asked);
        arrivals.push(arrived);
      },
      goToPassage: (passage: SoughtPassage) => {
        passages.push(passage);
        return Promise.resolve(world.arrival);
      },
      restyle: (settings: ReadingSettings, ink: PageInk) => {
        restyled.push(settings);
        inked.push(ink);
      },
      destroy: () => {
        destroyed.push(which);
      },
    };
  };

  return world;
}

function relocated(cfi: string, at: Partial<FlowRelocation> = {}): FlowRelocation {
  return { cfi, cause: TRAVELLED, ...at };
}

function places(edits: readonly BookEdit[]): readonly (ReadingPlace | undefined)[] {
  return edits.map((edit) => edit.position);
}

describe('FlowView what the opened book reports', () => {
  it('takes the direction, the paging and the chapter boundaries the opened book reports, not the direction the record holds', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.direction = 'rtl';
    surfaces.paging = { axis: 'horizontal', direction: 'rtl' };
    surfaces.ticks = [Number.EPSILON, 0.5, 0.25];
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open({ ...novel(world.place), direction: 'ltr' }, world.stored, surfaces.show);

    expect(view.navigation.direction).toBe('rtl');
    expect(view.navigation.paging).toEqual({ axis: 'horizontal', direction: 'rtl' });
    expect(view.navigation.ticks).toEqual([0.25, 0.5]);
  });

  it('reads left to right, marks nothing and reports no place until the book says otherwise', async () => {
    const world = shelf();
    const view = new FlowView(world.container, IGNORED, createTestQueryClient());

    expect(view.navigation.direction).toBe('ltr');
    expect(view.navigation.paging).toEqual({ axis: 'horizontal', direction: 'ltr' });
    expect(view.navigation.ticks).toEqual([]);
    expect(view.appearance.settings).toEqual(DEFAULT_READING_SETTINGS);

    await view.open(novel(world.place), world.stored, shows().show);

    expect(view.navigation.progress).toEqual({ kind: 'unknown' });
    expect(view.navigation.chapter).toBeNull();
  });

  it('forgets the direction, the paging, the boundaries, the contents and the place of a book the viewer closed', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.direction = 'rtl';
    surfaces.paging = { axis: 'vertical', mode: 'vertical-rl' };
    surfaces.ticks = [0.25, 0.5];
    const chapter: TocItem = { label: 'Chapter One', href: 'ch1.xhtml' };
    surfaces.toc = [chapter];
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.5, tocItem: chapter }));

    view.close();

    expect(view.navigation.direction).toBe('ltr');
    expect(view.navigation.paging).toEqual({ axis: 'horizontal', direction: 'ltr' });
    expect(view.navigation.ticks).toEqual([]);
    expect(view.navigation.contents).toEqual({ kind: 'absent' });
    expect(view.navigation.currentKey).toBeNull();
    expect(view.navigation.progress).toEqual({ kind: 'unknown' });
    expect(view.navigation.chapter).toBeNull();
  });
});

describe('FlowView', () => {
  it('reads the stored source and hands it to the surface', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(world.reads).toEqual([NOVEL]);
    expect(surfaces.openings.map((opening) => opening.source)).toEqual([SOURCE]);
    expect(view.state).toEqual({ kind: 'ready' });
    expect(view.curtain).toEqual({ kind: 'none' });
  });

  it('waits behind an opening curtain while the book is opened', async () => {
    const world = shelf();
    const surfaces = shows();
    const gate = held();
    surfaces.gate = gate.promise;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    const opening = view.open(novel(world.place), world.stored, surfaces.show);
    await Promise.resolve();
    await Promise.resolve();
    expect(view.curtain).toEqual({ kind: 'opening' });

    gate.release();
    await opening;
    expect(view.curtain).toEqual({ kind: 'none' });
  });

  const REFUSED_READS: readonly (readonly [string, Reads, string])[] = [
    [
      'a book whose file is gone apart from a removed book',
      { kind: 'source-missing', id: NOVEL },
      SOURCE_MISSING,
    ],
    [
      'storage that the browser refuses',
      STORAGE_UNAVAILABLE,
      'This browser blocks local storage, so that book cannot be read.',
    ],
  ];

  it.each(REFUSED_READS)('reports %s', async (_refusal, refused, message) => {
    const world = shelf();
    const surfaces = shows();
    world.read = () => Promise.resolve(refused);
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(surfaces.openings).toEqual([]);
    expect(view.curtain).toEqual({ kind: 'notice', message });
  });

  it('reports the cause when a read throws', async () => {
    const world = shelf();
    world.read = () => Promise.reject(new Error('disk gone'));
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, shows().show);

    expect(view.curtain).toEqual({
      kind: 'notice',
      message: 'That book could not be read: disk gone',
    });
  });

  it('reports a book the renderer refuses rather than showing a blank page', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.failure = 'not a zip';
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(view.state).toEqual({
      kind: 'failed',
      message: 'This book could not be displayed: not a zip',
    });
  });

  it('destroys the open surface when the viewer closes', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);
    view.close();

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('destroys the open surface before opening another book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);
    await view.open({ ...novel(world.place), id: bookId('two') }, world.stored, surfaces.show);

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'ready' });
  });

  it('destroys a surface that arrives after the viewer closed', async () => {
    const world = shelf();
    const surfaces = shows();
    const gate = held();
    surfaces.gate = gate.promise;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    const opening = view.open(novel(world.place), world.stored, surfaces.show);
    await settled();
    expect(surfaces.openings).toHaveLength(1);

    view.close();
    gate.release();
    await opening;

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('leaves a closed viewer silent when a late read fails', async () => {
    const world = shelf();
    const gate = held();
    world.read = async () => {
      await gate.promise;
      return STORAGE_UNAVAILABLE;
    };
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    const opening = view.open(novel(world.place), world.stored, shows().show);
    view.close();
    gate.release();
    await opening;

    expect(view.state).toEqual({ kind: 'idle' });
  });
});

describe('the place a flow book opens at', () => {
  it('opens at the cfi the reader stopped at', async () => {
    const world = shelf();
    const surfaces = shows();
    world.place = textPlace(SOMEWHERE, null);
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(surfaces.openings.map((opening) => opening.at)).toEqual([SOMEWHERE]);
  });

  it('opens at the start when the book is still at the start of its text', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(surfaces.openings.map((opening) => opening.at)).toEqual([null]);
  });
});

describe('the place a flow book keeps', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('calls onmoved once per relocation', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const heard: (string | null)[] = [];
    await view.open(novel(world.place), world.stored, surfaces.show, () =>
      heard.push(view.navigation.location?.cfi ?? null),
    );
    const moved = surfaces.openings[0]?.moved;

    moved?.(relocated(SOMEWHERE));
    moved?.(relocated(FURTHER_ON));

    expect(heard).toEqual([SOMEWHERE, FURTHER_ON]);
  });

  it('ignores a move that arrives after the viewer closed, calling no onmoved and saving nothing', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    let heard = 0;
    await view.open(novel(world.place), world.stored, surfaces.show, () => (heard += 1));
    const moved = surfaces.openings[0]?.moved;

    view.close();
    moved?.(relocated(SOMEWHERE, { fraction: 0.5 }));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(heard).toBe(0);
    expect(world.edits).toEqual([]);
    expect(view.navigation.progress).toEqual({ kind: 'unknown' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves a place still waiting when the reader leaves the book, fraction and all', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.37 }));
    expect(world.edits).toEqual([]);

    view.close();
    await vi.advanceTimersByTimeAsync(0);

    expect(places(world.edits)).toEqual([textPlace(SOMEWHERE, 0.37)]);
  });

  it('tells the book changed once a place is saved, and reports nothing', async () => {
    const world = shelf();
    const surfaces = shows();
    let changed = 0;
    const view = new FlowView(world.container, world.notify, createTestQueryClient(), () => {
      changed += 1;
    });
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE));

    view.close();
    await settled();

    expect(changed).toBe(1);
    expect(world.edits).toHaveLength(1);
    expect(world.notices).toEqual([]);
  });

  it('tells nothing when a place save fails', async () => {
    const world = shelf();
    const surfaces = shows();
    world.save = () => Promise.resolve(STORAGE_UNAVAILABLE);
    let changed = 0;
    const view = new FlowView(world.container, world.notify, createTestQueryClient(), () => {
      changed += 1;
    });
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE));

    view.close();
    await settled();

    expect(changed).toBe(0);
  });

  const STORED_PLACES: readonly (readonly [
    string,
    ReadingPlace,
    FlowRelocation,
    readonly ReadingPlace[],
  ])[] = [
    [
      'nothing for the cfi the book is already stored at',
      textPlace(SOMEWHERE, null),
      relocated(SOMEWHERE),
      [],
    ],
    [
      'nothing for the place the book is already stored at, fraction and all',
      textPlace(SOMEWHERE, 0.37),
      relocated(SOMEWHERE, { fraction: 0.37 }),
      [],
    ],
    [
      'the fraction a record stored without one gains at the same cfi',
      textPlace(SOMEWHERE, null),
      relocated(SOMEWHERE, { fraction: 0.37 }),
      [textPlace(SOMEWHERE, 0.37)],
    ],
    [
      'a place whose fraction moved although its cfi did not',
      textPlace(SOMEWHERE, 0.37),
      relocated(SOMEWHERE, { fraction: 0.41 }),
      [textPlace(SOMEWHERE, 0.41)],
    ],
  ];

  it.each(STORED_PLACES)('saves %s', async (_case, stored, relocation, saved) => {
    const world = shelf();
    const surfaces = shows();
    world.place = stored;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    surfaces.openings[0]?.moved(relocation);
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(places(world.edits)).toEqual(saved);
  });

  it('saves the fraction the book reported beside the cfi it stopped at', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.37 }));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(places(world.edits)).toEqual([textPlace(SOMEWHERE, 0.37)]);
  });

  it('keeps showing the book when a place cannot be saved', async () => {
    const world = shelf();
    const surfaces = shows();
    world.save = () => Promise.resolve(STORAGE_UNAVAILABLE);
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(view.state).toEqual({ kind: 'ready' });
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: PLACE_FAILED,
        message: 'This browser blocks local storage, so your place cannot be kept.',
      },
    ]);
  });

  it('saves the same place again at the next turn after a save failed', async () => {
    const world = shelf();
    const surfaces = shows();
    world.save = () => Promise.resolve(STORAGE_UNAVAILABLE);
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    const moved = surfaces.openings[0]?.moved;

    moved?.(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);
    moved?.(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(places(world.edits)).toEqual([textPlace(SOMEWHERE, null), textPlace(SOMEWHERE, null)]);
  });
});

describe('the progress a flow book reports', () => {
  it('reports how far through the book the reader is', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    surfaces.openings[0]?.moved(
      relocated(SOMEWHERE, { fraction: 0.375, tocItem: { label: ' Chapter Two ' } }),
    );

    expect(view.navigation.progress).toEqual({ kind: 'known', fraction: 0.375, percent: 38 });
    expect(view.navigation.chapter).toBe('Chapter Two');
  });
});

describe('the controls a flow book offers', () => {
  it('turns the page in reading order, whichever way the book runs', async () => {
    const world = shelf();
    const turned: (readonly string[])[] = [];

    for (const direction of ['ltr', 'rtl'] as const) {
      const surfaces = shows();
      surfaces.direction = direction;
      const view = new FlowView(world.container, world.notify, createTestQueryClient());
      await view.open(novel(world.place), world.stored, surfaces.show);

      view.navigation.turn('previous');
      view.navigation.turn('next');
      turned.push(surfaces.turned);
    }

    expect(turned).toEqual([
      ['prev', 'next'],
      ['prev', 'next'],
    ]);
  });

  it('turns nothing while no book is open', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    view.navigation.turn('next');
    await view.open(novel(world.place), world.stored, surfaces.show);
    view.close();
    view.navigation.turn('next');

    expect(surfaces.turned).toEqual([]);
  });

  it('sends the scrubbed fraction to the book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.2 }));

    view.navigation.seek(0.6);

    expect(surfaces.sought).toEqual([0.6]);
  });

  it('refuses a scrub on a book that cannot say how far through it is', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE));

    view.navigation.seek(0.6);

    expect(surfaces.sought).toEqual([]);
  });
});

describe('the contents a flow book offers', () => {
  const CHAPTER_ONE: TocItem = { label: 'Chapter One', href: 'ch1.xhtml' };

  const CHAPTER_TWO: TocItem = { label: 'Chapter One', href: 'ch2.xhtml' };

  function entries(view: FlowView): readonly ContentsEntry[] {
    const contents = view.navigation.contents;
    return contents.kind === 'listed' ? contents.entries : [];
  }

  it('lists the navigation the surface read out of the book', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [CHAPTER_ONE, CHAPTER_TWO];
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(entries(view).map((entry) => (entry.kind === 'link' ? entry.href : null))).toEqual([
      'ch1.xhtml',
      'ch2.xhtml',
    ]);
  });

  it('marks the entry the book reports, and not the one that shares its name', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [CHAPTER_ONE, CHAPTER_TWO];
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { tocItem: CHAPTER_TWO }));

    expect(view.navigation.currentKey).toBe('1');
  });

  it('jumps to the target of an entry the reader picked', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [CHAPTER_ONE];
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    const [entry] = entries(view);
    if (entry !== undefined) view.navigation.jumpTo(entry);

    expect(surfaces.jumped).toEqual(['ch1.xhtml']);
  });

  it('jumps nowhere for an entry that names a part but goes to none', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [{ label: 'Part One' }];
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    const [entry] = entries(view);
    if (entry !== undefined) view.navigation.jumpTo(entry);

    expect(surfaces.jumped).toEqual([]);
  });
});

describe('FlowView reading settings', () => {
  it('opens the book at the size and spacing it is handed', async () => {
    const world = shelf();
    world.stored = { textSize: 'largest', lineSpacing: 'loose', showPhoneticReadings: true };
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(surfaces.openings.map((opening) => opening.settings)).toEqual([world.stored]);
    expect(view.appearance.settings).toEqual(world.stored);
  });

  const RESTYLES: readonly (readonly [string, ReadingSettings])[] = [
    ['resizes the text', { textSize: 'large', lineSpacing: 'tight', showPhoneticReadings: true }],
    ['hides the readings', { ...DEFAULT_READING_SETTINGS, showPhoneticReadings: false }],
  ];

  it.each(RESTYLES)(
    'restyles the chapter already on screen rather than opening the book again when the reader %s',
    async (_change, chosen) => {
      const world = shelf();
      const surfaces = shows();
      const view = new FlowView(world.container, world.notify, createTestQueryClient());
      await view.open(novel(world.place), world.stored, surfaces.show);

      view.appearance.restyle(chosen);
      await settled();

      expect(surfaces.restyled).toEqual([chosen]);
      expect(surfaces.openings).toHaveLength(1);
      expect(surfaces.destroyed).toEqual([]);
      expect(world.notices).toEqual([]);
    },
  );

  it('saves a chosen size as a reading setting and keeps it out of the book record', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    const chosen: ReadingSettings = {
      textSize: 'small',
      lineSpacing: 'relaxed',
      showPhoneticReadings: true,
    };

    view.appearance.restyle(chosen);
    await settled();

    expect(world.chosen).toEqual([chosen]);
    expect(places(world.edits)).toEqual([]);
  });

  it('holds a choice made before a book is open, and touches no surface', () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    view.appearance.restyle({
      textSize: 'large',
      lineSpacing: 'loose',
      showPhoneticReadings: true,
    });

    expect(view.appearance.settings).toEqual({
      textSize: 'large',
      lineSpacing: 'loose',
      showPhoneticReadings: true,
    });
    expect(surfaces.restyled).toEqual([]);
  });
});

describe('FlowView page ink', () => {
  const PAPER: PageInk = {
    scheme: 'light',
    text: 'oklch(0.22 0.012 255)',
    link: 'oklch(0.46 0.09 195)',
    selection: 'oklch(0.93 0.04 195)',
    selectionText: 'oklch(0.22 0.012 255)',
  };

  it('opens the book in the dark page ink when nothing painted it', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(surfaces.openings.map((opening) => opening.ink)).toEqual([INK_FOR_THE_DARK_PAGE]);
  });

  it('opens the book in the ink painted before it opened, and restyles nothing', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    view.appearance.paint(PAPER);
    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(surfaces.openings.map((opening) => opening.ink)).toEqual([PAPER]);
    expect(surfaces.restyled).toEqual([]);
  });

  it('repaints the chapter on screen with the settings already chosen', async () => {
    const world = shelf();
    world.stored = { textSize: 'large', lineSpacing: 'loose', showPhoneticReadings: false };
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    view.appearance.paint(PAPER);

    expect(surfaces.inked).toEqual([PAPER]);
    expect(surfaces.restyled).toEqual([world.stored]);
    expect(surfaces.openings).toHaveLength(1);
  });

  it('restyles nothing for an ink equal to the one on the page', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    view.appearance.paint(PAPER);
    await view.open(novel(world.place), world.stored, surfaces.show);

    view.appearance.paint({ ...PAPER });

    expect(surfaces.restyled).toEqual([]);
  });

  it('remembers no reading settings when it repaints', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    view.appearance.paint(PAPER);
    await settled();

    expect(world.chosen).toEqual([]);
  });

  it('keeps the painted ink when the reader resizes the text', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    view.appearance.paint(PAPER);
    await view.open(novel(world.place), world.stored, surfaces.show);

    view.appearance.restyle({
      textSize: 'small',
      lineSpacing: 'tight',
      showPhoneticReadings: true,
    });

    expect(surfaces.inked).toEqual([PAPER]);
  });

  it('repaints a book that was still opening when the ink changed', async () => {
    const world = shelf();
    const surfaces = shows();
    const gate = held();
    surfaces.gate = gate.promise;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const opening = view.open(novel(world.place), world.stored, surfaces.show);
    await settled();

    view.appearance.paint(PAPER);
    gate.release();
    await opening;

    expect(surfaces.openings.map((opened) => opened.ink)).toEqual([INK_FOR_THE_DARK_PAGE]);
    expect(surfaces.inked).toEqual([PAPER]);
  });
});

describe('FlowView jumpToPassage', () => {
  const QUOTE: TextQuote = {
    exact: '厳重に鍵',
    prefix: 'その病室は、外から',
    suffix: 'がかけられて',
  };

  it('takes the book to the stored passage and says nothing about it', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    expect(surfaces.passages).toEqual([{ cfi: SOMEWHERE, quote: QUOTE }]);
    expect(view.arrivals.notice).toBeNull();
  });

  const REFOUND = 'epubcfi(/6/14!/4/2/16/1:4)';

  const A_PAGE = 'epubcfi(/6/14!/4/2/10,/1:0,/1:14)';

  const ANOTHER_PAGE = 'epubcfi(/6/14!/4/2/22,/1:0,/1:9)';

  const NOTICES: readonly (readonly [string, PassageArrival, string])[] = [
    ['moved when its text found it instead', foundByItsText(REFOUND), MOVED_SINCE_IT_WAS_CAPTURED],
    [
      'is gone when neither the cfi nor the text found it',
      THE_PASSAGE_IS_LOST,
      NOT_IN_THE_BOOK_ANY_MORE,
    ],
  ];

  it.each(NOTICES)('tells the reader the passage %s', async (_case, arrival, notice) => {
    const world = shelf();
    const surfaces = shows();
    surfaces.arrival = arrival;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    expect(view.arrivals.notice).toBe(notice);
  });

  it('takes its message away when the reader hides it', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.arrival = THE_PASSAGE_IS_LOST;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    view.arrivals.dismissNotice();

    expect(view.arrivals.notice).toBeNull();
  });

  it('asks nothing of a viewer with no book open', async () => {
    const surfaces = shows();
    const view = new FlowView(shelf().container, IGNORED, createTestQueryClient());

    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    expect(surfaces.passages).toEqual([]);
    expect(view.arrivals.notice).toBeNull();
  });

  it('marks the passage it arrived at, on the page it landed on', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(A_PAGE));

    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    expect(surfaces.arrivals.at(-1)).toEqual({
      kind: 'arrived',
      cfi: SOMEWHERE,
      place: A_PAGE,
    });
  });

  it('takes the mark away when the reader turns the page', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(A_PAGE));
    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    surfaces.openings[0]?.moved(relocated(ANOTHER_PAGE));

    expect(surfaces.arrivals.at(-1)).toEqual(NOTHING_ARRIVED_AT);
  });

  it('takes the mark and the notice away when the reader dismisses the arrival, and reports no arrival standing', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(A_PAGE));
    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    view.arrivals.dismissArrival();

    expect(surfaces.arrivals.at(-1)).toEqual(NOTHING_ARRIVED_AT);
    expect(view.arrivals.notice).toBeNull();
    expect(view.arrivals.arrivalStanding).toBe(false);
  });

  it('redraws nothing when the reader dismisses an arrival that is already gone', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(A_PAGE));
    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);
    view.arrivals.dismissArrival();
    const drawn = surfaces.arrivals.length;

    view.arrivals.dismissArrival();

    expect(surfaces.arrivals.length).toBe(drawn);
  });

  it('reports an arrival is standing while the reader has not moved off it', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(A_PAGE));
    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    expect(view.arrivals.arrivalStanding).toBe(true);
  });

  it('keeps the marked passage drawn when the reader deletes its capture', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    view.arrivals.markPassages([SOMEWHERE]);
    await view.open(novel(world.place), world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(A_PAGE));
    await view.arrivals.jumpToPassage(SOMEWHERE, QUOTE);

    view.arrivals.markPassages([]);

    expect(surfaces.arrivals.at(-1)).toEqual({
      kind: 'arrived',
      cfi: SOMEWHERE,
      place: A_PAGE,
    });
  });
});

describe('FlowView markPassages', () => {
  const ANOTHER = 'epubcfi(/6/18!/4/2/8/1:30)';

  it('draws the captures the reader already had when the book opens', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    view.arrivals.markPassages([SOMEWHERE]);
    await view.open(novel(world.place), world.stored, surfaces.show);

    expect(surfaces.marked).toEqual([[SOMEWHERE]]);
  });

  it('draws a capture taken while the book is open', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    view.arrivals.markPassages([SOMEWHERE, ANOTHER]);

    expect(surfaces.marked).toEqual([[], [SOMEWHERE, ANOTHER]]);
  });
});

describe('FlowView arriveAt', () => {
  const PASSAGE: TextAnchor = {
    kind: 'text',
    cfi: SOMEWHERE,
    quote: { exact: '厳重に鍵', prefix: '', suffix: '' },
    chapter: null,
  };

  const ELSEWHERE: TextAnchor = { ...PASSAGE, cfi: 'epubcfi(/6/20!/4/2/1:0)' };

  const ASKED: readonly (readonly [string, SoughtPassage])[] = [
    ['a link asked for, and marks it', { cfi: PASSAGE.cfi, quote: PASSAGE.quote }],
    ['a cfi a url named with no capture behind it, and rings it', { cfi: SOMEWHERE, quote: null }],
  ];

  it.each(ASKED)('takes the open book to %s', async (_case, passage) => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);

    view.arrivals.arriveAt(book.id, passage);
    await settled();

    expect(surfaces.passages).toEqual([passage]);
    expect(surfaces.arrivals.at(-1)).toMatchObject({ kind: 'arrived', cfi: passage.cfi });
  });

  it('keeps the ring on a passage asked for before the book opened while the page settles', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    view.arrivals.arriveAt(book.id, PASSAGE);
    await view.open(book, world.stored, surfaces.show);
    await settled();

    surfaces.openings[0]?.moved(relocated(FURTHER_ON, { cause: REFLOWED }));

    expect(surfaces.arrivals.at(-1)).toMatchObject({ kind: 'arrived', cfi: PASSAGE.cfi });
  });

  it('holds a passage asked for before the book opens, and goes there once it has', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);

    view.arrivals.arriveAt(book.id, PASSAGE);
    expect(surfaces.passages).toEqual([]);
    await view.open(book, world.stored, surfaces.show);
    await settled();

    expect(surfaces.passages).toEqual([{ cfi: PASSAGE.cfi, quote: PASSAGE.quote }]);
  });

  it('holds a passage asked for while the book is still opening', async () => {
    const world = shelf();
    const surfaces = shows();
    const gate = held();
    surfaces.gate = gate.promise;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    const opening = view.open(book, world.stored, surfaces.show);
    await settled();

    view.arrivals.arriveAt(book.id, PASSAGE);
    gate.release();
    await opening;
    await settled();

    expect(surfaces.passages.map((asked) => asked.cfi)).toEqual([PASSAGE.cfi]);
  });

  it('leaves a book that opens a passage asked for in another book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());

    view.arrivals.arriveAt(bookId('another'), PASSAGE);
    await view.open(novel(world.place), world.stored, surfaces.show);
    await settled();

    expect(surfaces.passages).toEqual([]);
  });

  it('takes the book there once, however often the same passage is asked for', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);

    view.arrivals.arriveAt(book.id, PASSAGE);
    view.arrivals.arriveAt(book.id, { ...PASSAGE });
    await settled();

    expect(surfaces.passages).toHaveLength(1);
  });

  it('takes the book to a different passage asked for next', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);

    view.arrivals.arriveAt(book.id, PASSAGE);
    view.arrivals.arriveAt(book.id, ELSEWHERE);
    await settled();

    expect(surfaces.passages.map((asked) => asked.cfi)).toEqual([PASSAGE.cfi, ELSEWHERE.cfi]);
  });

  it('takes the book to the same passage again once the book is opened again', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);
    view.arrivals.arriveAt(book.id, PASSAGE);

    await view.open(book, world.stored, surfaces.show);
    view.arrivals.arriveAt(book.id, PASSAGE);
    await settled();

    expect(surfaces.passages).toHaveLength(2);
  });

  it('holds the arrival through the move its own jump makes', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(FURTHER_ON));

    view.arrivals.arriveAt(book.id, PASSAGE);
    surfaces.openings[0]?.moved(relocated(LATER_STILL));
    await settled();

    expect(view.arrivals.arrivalHolds).toBe(true);
  });

  it('ends the arrival when the reader travels off the page it landed on', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(FURTHER_ON));
    view.arrivals.arriveAt(book.id, PASSAGE);
    await settled();

    surfaces.openings[0]?.moved(relocated(LATER_STILL));

    expect(view.arrivals.arrivalHolds).toBe(false);
  });

  it('holds the arrival after the reader dismisses its ring', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);
    view.arrivals.arriveAt(book.id, PASSAGE);
    await settled();

    view.arrivals.dismissArrival();

    expect(view.arrivals.arrivalHolds).toBe(true);
  });

  it('holds the arrival when a passage it could not find leaves the reader where they were', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.arrival = THE_PASSAGE_IS_LOST;
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(FURTHER_ON));

    view.arrivals.arriveAt(book.id, PASSAGE);
    await settled();

    expect(view.arrivals.arrivalHolds).toBe(true);
  });

  it('holds the next arrival through a step taken before the last one landed', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);
    surfaces.openings[0]?.moved(relocated(FURTHER_ON));

    view.arrivals.arriveAt(book.id, PASSAGE);
    view.arrivals.arriveAt(book.id, ELSEWHERE);
    surfaces.openings[0]?.moved(relocated(LATER_STILL));
    await settled();

    expect(view.arrivals.arrivalHolds).toBe(true);
  });

  it('holds no arrival for a passage the reader jumped to from a capture', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    await view.open(novel(world.place), world.stored, surfaces.show);

    await view.arrivals.jumpToPassage(PASSAGE.cfi, PASSAGE.quote);

    expect(view.arrivals.arrivalHolds).toBe(false);
  });

  it('forgets the arrival when the reader leaves the book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);
    view.arrivals.arriveAt(book.id, PASSAGE);
    await settled();

    view.close();

    expect(view.arrivals.arrivalHolds).toBe(false);
  });

  it('holds nothing for an arrival that lands after the reader left the book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container, world.notify, createTestQueryClient());
    const book = novel(world.place);
    await view.open(book, world.stored, surfaces.show);

    view.arrivals.arriveAt(book.id, PASSAGE);
    view.close();
    await settled();

    expect(view.arrivals.arrivalHolds).toBe(false);
  });
});
