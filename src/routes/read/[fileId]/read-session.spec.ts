import { SvelteURL } from 'svelte/reactivity';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { LIBRARY_AFTER_MISSING_BOOK } from '$lib/shared/reader-location';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { ReadSession } from './read-session.svelte';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/idle-write-query'));

const ORIGIN = 'https://reader.test';

const MISSING = bookId('gone');

type World = {
  readonly session: ReadSession;
  readonly url: SvelteURL;
  readonly opened: BookId[];
  readonly listed: () => readonly BookId[];
  readonly replaced: string[];
  readonly left: string[];
  readonly copied: string[];
  readonly notices: string[];
  shown: string;
};

function flowBook(id: BookId): unknown {
  return { id, title: 'Kokoro', language: 'ja', layoutKind: 'flow', imageCount: 0 };
}

const NO_COUNTING = { counts: () => new Map(), ask: () => undefined };

function world(address: string): World {
  const url = new SvelteURL(`${ORIGIN}${address}`);
  const opened: BookId[] = [];
  const replaced: string[] = [];
  const left: string[] = [];
  const copied: string[] = [];
  const notices: string[] = [];
  const container = {
    library: {
      openForReading: (id: BookId) => {
        opened.push(id);
        if (id === MISSING) {
          return Promise.resolve({ kind: 'not-found', id });
        }
        return Promise.resolve({ kind: 'flow', book: flowBook(id) });
      },
    },
  } as unknown as Container;
  const session = new ReadSession(
    container,
    createTestQueryClient(),
    () => undefined,
    {
      fileId: () => decodeURIComponent(url.pathname.split('/').at(-1) ?? ''),
      requested: () => url,
      shown: () => new URL(held.shown),
      replace: (next) => {
        replaced.push(next.href);
      },
      leave: (path) => {
        left.push(path);
      },
    },
    (text) => {
      copied.push(text);
      return Promise.resolve();
    },
    NO_COUNTING,
    () => undefined,
    () => undefined,
  );
  const opens = vi.spyOn(session.captures, 'open');
  const held: World = {
    session,
    url,
    opened,
    listed: () => opens.mock.calls.map(([book]) => book),
    replaced,
    left,
    copied,
    notices,
    shown: `${ORIGIN}${address}`,
  };
  return held;
}

function go(held: World, address: string): void {
  held.url.href = `${ORIGIN}${address}`;
  held.shown = held.url.href;
  held.session.navigate();
}

async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

class FakeStorage {
  readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new FakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReadSession', () => {
  it('opens the book and points the capture list at it on entering', async () => {
    const held = world('/read/one');

    held.session.navigate();
    await settled();

    expect(held.opened).toEqual([bookId('one')]);
    expect(held.listed()).toEqual([bookId('one')]);
  });

  it('closes every part before opening the next book on a switch', async () => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();
    const closed = [
      vi.spyOn(held.session.reader, 'dispose'),
      vi.spyOn(held.session.captures, 'close'),
    ];

    go(held, '/read/two');
    await settled();

    expect(closed.map((spy) => spy.mock.calls.length)).toEqual([1, 1]);
    expect(held.opened).toEqual([bookId('one'), bookId('two')]);
    expect(held.listed()).toEqual([bookId('one'), bookId('two')]);
  });

  it.each([
    ['closes', 'with no book', undefined, 1],
    ['closes', 'to another book', 'two', 1],
    ['keeps', 'within the book', 'one', 0],
  ])('%s the ebook reader on a navigation %s', async (_, __, next, closes) => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();
    const closed = vi.spyOn(held.session.flow, 'close');

    held.session.leaving(next);

    expect(closed).toHaveBeenCalledTimes(closes);
  });

  it('moves to an asked image within the open book without opening it again', async () => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();
    const moved = vi.spyOn(held.session.reader.navigation, 'goToImage');

    go(held, '/read/one?image=3');

    expect(moved).toHaveBeenCalledWith(bookId('one'), imageIndex(3));
    expect(held.opened).toEqual([bookId('one')]);
  });

  it('opens nothing and moves nowhere when the address names the same place', async () => {
    const held = world('/read/one?image=3');
    held.session.navigate();
    await settled();
    const moved = vi.spyOn(held.session.reader.navigation, 'goToImage');

    go(held, '/read/one?image=3');
    await settled();

    expect(moved).not.toHaveBeenCalled();
    expect(held.opened).toEqual([bookId('one')]);
  });

  it.each([
    [
      'leaves for the library when the book is no longer there',
      '/read/gone',
      [LIBRARY_AFTER_MISSING_BOOK],
    ],
    ['stays on a book that opened', '/read/one', []],
  ])('%s', async (_, address, left) => {
    const held = world(address);

    held.session.navigate();
    await settled();

    expect(held.left).toEqual(left);
  });

  it('leaves for the library without opening anything when the address names no book', async () => {
    const held = world('/read/a%2F..%2Fb');

    held.session.navigate();
    await settled();

    expect(held.session.id).toBeNull();
    expect(held.opened).toEqual([]);
    expect(held.listed()).toEqual([]);
    expect(held.left).toEqual([LIBRARY_AFTER_MISSING_BOOK]);
  });

  it('writes the image the reader arrived at into the address', () => {
    const held = world('/read/one');

    held.session.mirror({ kind: 'arrived', index: imageIndex(2) });

    expect(held.replaced).toEqual([`${ORIGIN}/read/one?image=2`]);
  });

  it('hides the image arrival once the reader turns away, until the next navigation', () => {
    const held = world('/read/one?image=1&region=0.1,0.1,0.2,0.2&find=海');
    held.session.navigate();

    held.session.mirror({ kind: 'moved', index: imageIndex(4), group: [imageIndex(4)] });
    const afterTurning = held.session.arrivalShows;
    held.session.navigate();

    expect(afterTurning).toBe(false);
    expect(held.session.arrivalShows).toBe(true);
  });

  it('keeps the image arrival while the shown group holds the named image', () => {
    const held = world('/read/one?image=1&find=海');
    held.session.navigate();

    held.session.mirror({
      kind: 'moved',
      index: imageIndex(0),
      group: [imageIndex(0), imageIndex(1)],
    });

    expect(held.session.arrivalShows).toBe(true);
    expect(held.replaced).toEqual([]);
  });

  it('asks the ebook reader for the sought passage once the captures are read', async () => {
    const held = world('/read/one?cfi=epubcfi(/6/4)');
    const arriving = vi.spyOn(held.session.flow.arrivals, 'arriveAt');
    held.session.navigate();
    await settled();
    expect(arriving).not.toHaveBeenCalled();

    held.session.capturesRead(bookId('one'));

    expect(arriving).toHaveBeenCalledWith(bookId('one'), { cfi: 'epubcfi(/6/4)', quote: null });
  });

  it('asks the ebook reader once however often the captures are read again', async () => {
    const held = world('/read/one?cfi=epubcfi(/6/4)');
    const arriving = vi.spyOn(held.session.flow.arrivals, 'arriveAt');
    held.session.navigate();
    await settled();

    held.session.capturesRead(bookId('one'));
    held.session.capturesRead(bookId('one'));

    expect(arriving).toHaveBeenCalledTimes(1);
  });

  it('asks the ebook reader nothing for the captures of a book it left', async () => {
    const held = world('/read/one?cfi=epubcfi(/6/4)');
    const arriving = vi.spyOn(held.session.flow.arrivals, 'arriveAt');
    held.session.navigate();
    await settled();
    go(held, '/read/two?cfi=epubcfi(/6/4)');
    await settled();

    held.session.capturesRead(bookId('one'));

    expect(arriving).not.toHaveBeenCalled();
  });

  it('asks the ebook reader for nothing when the address seeks no passage', async () => {
    const held = world('/read/one?image=2');
    const arriving = vi.spyOn(held.session.flow.arrivals, 'arriveAt');
    held.session.navigate();
    await settled();

    held.session.capturesRead(bookId('one'));

    expect(arriving).not.toHaveBeenCalled();
  });

  it('reads the book and the search query from the address', () => {
    const held = world('/read/one?image=1&find=%E6%B5%B7');

    expect(held.session.id).toBe(bookId('one'));
    expect(held.session.finding).toBe('海');
  });

  it('gives the image panel a fresh state only on leaving an ebook', async () => {
    const held = world('/read/gone');
    held.session.navigate();
    await settled();
    const first = held.session.imagePanel;

    go(held, '/read/one');
    await settled();
    const afterMissing = held.session.imagePanel;
    go(held, '/read/two');
    await settled();

    expect(afterMissing).toBe(first);
    expect(held.session.imagePanel).not.toBe(first);
  });

  it('gives the ebook panel a fresh state on every switch of book', async () => {
    const held = world('/read/gone');
    held.session.navigate();
    await settled();
    const first = held.session.flowPanel;

    go(held, '/read/one');
    await settled();
    const second = held.session.flowPanel;
    go(held, '/read/one?image=2');

    expect(second).not.toBe(first);
    expect(held.session.flowPanel).toBe(second);
  });

  it('keeps both panels when the address moves within the open book', async () => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();
    const panels = [held.session.imagePanel, held.session.flowPanel];

    go(held, '/read/one?image=2');
    await settled();

    expect([held.session.imagePanel, held.session.flowPanel]).toEqual(panels);
  });

  it('links passages from the ebook panel and not from the image panel', async () => {
    const held = world('/read/one');
    held.session.captures.list.unsaved.put({
      id: captureId('lifted'),
      anchor: {
        kind: 'text',
        cfi: '/6/4',
        quote: { exact: '海', prefix: '', suffix: '' },
        chapter: null,
      },
      tagIds: [],
      origin: 'lifted',
      note: null,
      status: 'pending',
    } as never);

    expect(held.session.flowPanel.cards.cards.map((card) => card.passage !== null)).toEqual([true]);
    expect(held.session.imagePanel.cards.cards.map((card) => card.passage !== null)).toEqual([
      false,
    ]);
  });

  it('copies through the clipboard write it was given', async () => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();

    await held.session.imagePanel.copying.copy(captureId('a'), '海');

    expect(held.copied).toEqual(['海']);
  });

  it('tells a refused copy through the notify it was given', async () => {
    const held = world('/read/one');
    const refusing = new ReadSession(
      {} as Container,
      createTestQueryClient(),
      (notice) => held.notices.push(notice.title),
      {
        fileId: () => 'one',
        requested: () => held.url,
        shown: () => held.url,
        replace: () => undefined,
        leave: () => undefined,
      },
      () => Promise.reject(new Error('the clipboard is locked')),
      NO_COUNTING,
      () => undefined,
      () => undefined,
    );

    await refusing.flowPanel.copying.copy(captureId('a'), '海');

    expect(held.notices).toEqual(['The text could not be copied']);
  });

  it('orders each panel by the direction of its own reader', () => {
    const held = world('/read/one');
    for (const [id, x] of [
      ['left', 0],
      ['right', 200],
    ] as const) {
      held.session.captures.list.unsaved.put({
        id: captureId(id),
        anchor: {
          kind: 'region',
          regions: [{ index: imageIndex(3), rect: { x, y: 0, width: 40, height: 20 } }],
        },
        tagIds: [],
        origin: 'recognized',
        note: null,
        status: 'pending',
      } as never);
    }
    held.session.flow.navigation.direction = 'ltr';
    const flowingRight = held.session.flowPanel.cards.cards.map((card) => card.id);
    held.session.flow.navigation.direction = 'rtl';

    expect(held.session.imagePanel.cards.cards.map((card) => card.id)).toEqual(['left', 'right']);
    expect(flowingRight).toEqual(['left', 'right']);
    expect(held.session.flowPanel.cards.cards.map((card) => card.id)).toEqual(['right', 'left']);
  });

  it('marks a chapter place in both panels with the language of the open book', async () => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();
    held.session.captures.list.unsaved.put({
      id: captureId('lifted'),
      anchor: {
        kind: 'text',
        cfi: '/6/4',
        quote: { exact: '海', prefix: '', suffix: '' },
        chapter: '一',
      },
      tagIds: [],
      origin: 'lifted',
      note: null,
      status: 'pending',
    } as never);

    expect(held.session.imagePanel.cards.cards.map((card) => card.placeLanguage)).toEqual(['ja']);
    expect(held.session.flowPanel.cards.cards.map((card) => card.placeLanguage)).toEqual(['ja']);
  });
});
