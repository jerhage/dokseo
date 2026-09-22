import type { Relocation, TocItem } from 'foliate-js/view.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, contentHash } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { BookId } from '$lib/shared/ids';
import { START_OF_THE_TEXT, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { ContentsEntry } from './flow-contents';
import type { FlowOpening, FlowSurface } from './flow-surface';
import { FlowView, PLACE_SAVE_DELAY_MS } from './flow-view.svelte';
import type { FlowBook, ShowFlowBook } from './flow-view.svelte';

const NOVEL: BookId = bookId('one');

const SOURCE = new Blob(['PK'], { type: 'application/epub+zip' });

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

const FURTHER_ON = 'epubcfi(/6/16!/4/2/2/1:0)';

const LATER_STILL = 'epubcfi(/6/18!/4/2/8/1:0)';

type Reads = Awaited<ReturnType<Container['library']['readSource']>>;

type Edits = Awaited<ReturnType<Container['library']['editBook']>>;

type BookEdit = Parameters<Container['library']['editBook']>[1];

type LibraryFailure = Extract<Reads, { readonly ok: false }>['error'];

function novel(position: ReadingPlace): FlowBook {
  return {
    id: NOVEL,
    title: 'Kokoro',
    language: 'ja',
    layoutKind: 'flow',
    direction: 'rtl',
    pagePairing: 'double-after-cover',
    pageFit: 'width',
    sourceKind: 'epub',
    contentHash: contentHash('a1'),
    imageCount: 0,
    addedAt: 1758240000000,
    position,
  };
}

type Shelf = {
  container: Container;
  readonly edits: BookEdit[];
  readonly reads: BookId[];
  place: ReadingPlace;
  read: () => Promise<Reads>;
  save: () => Promise<Edits>;
};

const NO_CONTAINER = {} as unknown as Container;

function shelf(): Shelf {
  const world: Shelf = {
    container: NO_CONTAINER,
    edits: [],
    reads: [],
    place: START_OF_THE_TEXT,
    read: () => Promise.resolve(ok(SOURCE)),
    save: () => Promise.resolve(ok(novel(world.place))),
  };

  world.container = {
    library: {
      readSource: (id: BookId) => {
        world.reads.push(id);
        return world.read();
      },
      editBook: (_id: BookId, edit: BookEdit) => {
        world.edits.push(edit);
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
  toc: readonly TocItem[] | null;
  gate: Promise<void> | null;
  failure: string | null;
  direction: ReadingDirection;
};

function shows(): Shown {
  const openings: FlowOpening[] = [];
  const destroyed: number[] = [];
  const turned: string[] = [];
  const sought: number[] = [];
  const jumped: string[] = [];

  const world = {
    openings,
    destroyed,
    turned,
    sought,
    jumped,
    toc: null as readonly TocItem[] | null,
    gate: null as Promise<void> | null,
    failure: null as string | null,
    direction: 'ltr' as ReadingDirection,
    show: (() => Promise.reject(new Error('not built'))) as ShowFlowBook,
  };

  world.show = async (opening: FlowOpening): Promise<FlowSurface> => {
    openings.push(opening);
    const which = openings.length - 1;
    if (world.gate !== null) await world.gate;
    if (world.failure !== null) throw new Error(world.failure);
    return {
      direction: world.direction,
      pages: {
        goLeft: () => turned.push('goLeft'),
        goRight: () => turned.push('goRight'),
        prev: () => turned.push('prev'),
        next: () => turned.push('next'),
      },
      toc: world.toc,
      seek: (fraction: number) => {
        sought.push(fraction);
      },
      jump: (href: string) => {
        jumped.push(href);
      },
      destroy: () => {
        destroyed.push(which);
      },
    };
  };

  return world;
}

function relocated(cfi: string, at: Partial<Relocation> = {}): Relocation {
  return { cfi, ...at };
}

function places(edits: readonly BookEdit[]): readonly (ReadingPlace | undefined)[] {
  return edits.map((edit) => edit.position);
}

describe('FlowView direction', () => {
  it('takes the direction the opened book reports, not the one the record holds', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.direction = 'rtl';
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

    expect(view.direction).toBe('rtl');
  });

  it('reads left to right before a book has opened', () => {
    const view = new FlowView(shelf().container);

    expect(view.direction).toBe('ltr');
  });

  it('forgets the direction of a book the viewer closed', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.direction = 'rtl';
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    view.close();

    expect(view.direction).toBe('ltr');
  });
});

describe('FlowView', () => {
  it('reads the stored source and hands it to the surface', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

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
    const view = new FlowView(world.container);

    const opening = view.open(novel(world.place), surfaces.show);
    await Promise.resolve();
    await Promise.resolve();
    expect(view.curtain).toEqual({ kind: 'opening' });

    gate.release();
    await opening;
    expect(view.curtain).toEqual({ kind: 'none' });
  });

  it('reports a source that is no longer stored', async () => {
    const world = shelf();
    const surfaces = shows();
    world.read = () => Promise.resolve(err<LibraryFailure>({ kind: 'not-found', id: NOVEL }));
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

    expect(surfaces.openings).toEqual([]);
    expect(view.curtain).toEqual({
      kind: 'notice',
      message: 'That book is no longer stored on this device.',
    });
  });

  it('reports storage that the browser refuses', async () => {
    const world = shelf();
    world.read = () => Promise.resolve(err<LibraryFailure>({ kind: 'storage-unavailable' }));
    const view = new FlowView(world.container);

    await view.open(novel(world.place), shows().show);

    expect(view.curtain).toEqual({
      kind: 'notice',
      message: 'This browser blocks local storage, so that book cannot be read.',
    });
  });

  it('reports the cause when a read throws', async () => {
    const world = shelf();
    world.read = () => Promise.reject(new Error('disk gone'));
    const view = new FlowView(world.container);

    await view.open(novel(world.place), shows().show);

    expect(view.curtain).toEqual({
      kind: 'notice',
      message: 'That book could not be read: Error: disk gone',
    });
  });

  it('reports a book the renderer refuses rather than showing a blank page', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.failure = 'not a zip';
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

    expect(view.state).toEqual({
      kind: 'failed',
      message: 'This book could not be displayed: Error: not a zip',
    });
  });

  it('destroys the open surface when the viewer closes', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);
    view.close();

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('destroys the open surface before opening another book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);
    await view.open({ ...novel(world.place), id: bookId('two') }, surfaces.show);

    expect(surfaces.destroyed).toEqual([0]);
    expect(view.state).toEqual({ kind: 'ready' });
  });

  it('destroys a surface that arrives after the viewer closed', async () => {
    const world = shelf();
    const surfaces = shows();
    const gate = held();
    surfaces.gate = gate.promise;
    const view = new FlowView(world.container);

    const opening = view.open(novel(world.place), surfaces.show);
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
      return err<LibraryFailure>({ kind: 'storage-failed', cause: 'quota' });
    };
    const view = new FlowView(world.container);

    const opening = view.open(novel(world.place), shows().show);
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
    world.place = textPlace(SOMEWHERE);
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

    expect(surfaces.openings.map((opening) => opening.at)).toEqual([SOMEWHERE]);
  });

  it('opens at the start when the book is still at the start of its text', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

    expect(surfaces.openings.map((opening) => opening.at)).toEqual([null]);
  });
});

describe('the place a flow book keeps', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves only the last place once the page turning settles', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    const moved = surfaces.openings[0]?.moved;

    moved?.(relocated(SOMEWHERE));
    moved?.(relocated(FURTHER_ON));
    moved?.(relocated(LATER_STILL));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(places(world.edits)).toEqual([textPlace(LATER_STILL)]);
  });

  it('saves nothing while the pages are still turning', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS - 1);

    expect(world.edits).toEqual([]);
  });

  it('saves a place still waiting when the reader leaves the book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE));
    expect(world.edits).toEqual([]);

    view.close();

    expect(places(world.edits)).toEqual([textPlace(SOMEWHERE)]);
  });

  it('saves nothing for the cfi the book is already stored at', async () => {
    const world = shelf();
    const surfaces = shows();
    world.place = textPlace(SOMEWHERE);
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits).toEqual([]);
  });

  it('saves nothing for a move that arrives after the viewer closed', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    const moved = surfaces.openings[0]?.moved;

    view.close();
    moved?.(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(world.edits).toEqual([]);
  });

  it('keeps showing the book when a place cannot be saved', async () => {
    const world = shelf();
    const surfaces = shows();
    world.save = () =>
      Promise.resolve(err<LibraryFailure>({ kind: 'storage-failed', cause: 'io' }));
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(view.state).toEqual({ kind: 'ready' });
  });

  it('saves the same place again at the next turn after a save failed', async () => {
    const world = shelf();
    const surfaces = shows();
    world.save = () =>
      Promise.resolve(err<LibraryFailure>({ kind: 'storage-failed', cause: 'io' }));
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    const moved = surfaces.openings[0]?.moved;

    moved?.(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);
    moved?.(relocated(SOMEWHERE));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(places(world.edits)).toEqual([textPlace(SOMEWHERE), textPlace(SOMEWHERE)]);
  });
});

describe('the progress a flow book reports', () => {
  it('reports nothing until the book has said where it is', async () => {
    const world = shelf();
    const view = new FlowView(world.container);

    await view.open(novel(world.place), shows().show);

    expect(view.progress).toEqual({ kind: 'unknown' });
    expect(view.chapter).toBeNull();
  });

  it('reports how far through the book the reader is', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    surfaces.openings[0]?.moved(
      relocated(SOMEWHERE, { fraction: 0.375, tocItem: { label: ' Chapter Two ' } }),
    );

    expect(view.progress).toEqual({ kind: 'known', fraction: 0.375, percent: 38 });
    expect(view.chapter).toBe('Chapter Two');
  });

  it('reports nothing for a book that cannot say how far through it is', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE));

    expect(view.progress).toEqual({ kind: 'unknown' });
  });

  it('forgets where it was when the reader leaves the book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.5 }));

    view.close();

    expect(view.progress).toEqual({ kind: 'unknown' });
  });

  it('ignores a move that arrives after the viewer closed', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    const moved = surfaces.openings[0]?.moved;

    view.close();
    moved?.(relocated(SOMEWHERE, { fraction: 0.5 }));

    expect(view.progress).toEqual({ kind: 'unknown' });
  });
});

describe('the controls a flow book offers', () => {
  it('turns the page in reading order, whichever way the book runs', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    view.turn('previous');
    view.turn('next');

    expect(surfaces.turned).toEqual(['prev', 'next']);
  });

  it('turns nothing before a book is open', () => {
    const world = shelf();
    const view = new FlowView(world.container);

    view.turn('next');

    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('sends the scrubbed fraction to the book', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.2 }));

    view.seek(0.6);

    expect(surfaces.sought).toEqual([0.6]);
  });

  it('holds a scrub inside the book it can reach', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.2 }));

    view.seek(4);
    view.seek(-4);

    expect(surfaces.sought).toEqual([1, 0]);
  });

  it('refuses a scrub on a book that cannot say how far through it is', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE));

    view.seek(0.6);

    expect(surfaces.sought).toEqual([]);
  });

  it('refuses a scrub that is not a number at all', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);
    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { fraction: 0.2 }));

    view.seek(Number.NaN);

    expect(surfaces.sought).toEqual([]);
  });
});

describe('the contents a flow book offers', () => {
  const CHAPTER_ONE: TocItem = { label: 'Chapter One', href: 'ch1.xhtml' };

  const CHAPTER_TWO: TocItem = { label: 'Chapter One', href: 'ch2.xhtml' };

  function entries(view: FlowView): readonly ContentsEntry[] {
    const contents = view.contents;
    return contents.kind === 'listed' ? contents.entries : [];
  }

  it('lists the navigation the surface read out of the book', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [CHAPTER_ONE, CHAPTER_TWO];
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

    expect(entries(view).map((entry) => (entry.kind === 'link' ? entry.href : null))).toEqual([
      'ch1.xhtml',
      'ch2.xhtml',
    ]);
  });

  it('lists nothing for a book that carries no navigation', async () => {
    const world = shelf();
    const surfaces = shows();
    const view = new FlowView(world.container);

    await view.open(novel(world.place), surfaces.show);

    expect(view.contents).toEqual({ kind: 'absent' });
    expect(view.currentKey).toBeNull();
  });

  it('marks the entry the book reports, and not the one that shares its name', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [CHAPTER_ONE, CHAPTER_TWO];
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    surfaces.openings[0]?.moved(relocated(SOMEWHERE, { tocItem: CHAPTER_TWO }));

    expect(view.currentKey).toBe('1');
  });

  it('jumps to the target of an entry the reader picked', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [CHAPTER_ONE];
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    const [entry] = entries(view);
    if (entry !== undefined) view.jumpTo(entry);

    expect(surfaces.jumped).toEqual(['ch1.xhtml']);
  });

  it('jumps nowhere for an entry that names a part but goes to none', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [{ label: 'Part One' }];
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    const [entry] = entries(view);
    if (entry !== undefined) view.jumpTo(entry);

    expect(surfaces.jumped).toEqual([]);
  });

  it('forgets the contents when the reader leaves the book', async () => {
    const world = shelf();
    const surfaces = shows();
    surfaces.toc = [CHAPTER_ONE];
    const view = new FlowView(world.container);
    await view.open(novel(world.place), surfaces.show);

    view.close();

    expect(view.contents).toEqual({ kind: 'absent' });
  });
});
