import { SvelteURL } from 'svelte/reactivity';
import { describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { LIBRARY_AFTER_MISSING_BOOK } from '$lib/shared/reader-location';
import { err, ok } from '$lib/shared/result';
import { ReadSession } from './read-session.svelte';

const ORIGIN = 'https://reader.test';

const MISSING = bookId('gone');

type World = {
  readonly session: ReadSession;
  readonly url: SvelteURL;
  readonly opened: BookId[];
  readonly listed: BookId[];
  readonly replaced: string[];
  readonly left: string[];
  shown: string;
};

function flowBook(id: BookId): unknown {
  return { id, title: 'Kokoro', language: 'ja', layoutKind: 'flow', imageCount: 0 };
}

function world(address: string): World {
  const url = new SvelteURL(`${ORIGIN}${address}`);
  const opened: BookId[] = [];
  const listed: BookId[] = [];
  const replaced: string[] = [];
  const left: string[] = [];
  const container = {
    library: {
      openForReading: (id: BookId) => {
        opened.push(id);
        if (id === MISSING) {
          return Promise.resolve(err({ kind: 'library', error: { kind: 'not-found', id } }));
        }
        return Promise.resolve(ok({ kind: 'flow', book: flowBook(id) }));
      },
    },
    recognition: {
      listCaptures: (book: BookId) => {
        listed.push(book);
        return Promise.resolve(ok([]));
      },
      listTags: () => Promise.resolve(ok([])),
    },
  } as unknown as Container;
  const held: World = {
    session: new ReadSession(container, () => undefined, {
      fileId: () => decodeURIComponent(url.pathname.split('/').at(-1) ?? ''),
      requested: () => url,
      shown: () => new URL(held.shown),
      replace: (next) => {
        replaced.push(next.href);
      },
      leave: (path) => {
        left.push(path);
      },
    }),
    url,
    opened,
    listed,
    replaced,
    left,
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

describe('ReadSession', () => {
  it('opens the book and its captures on entering', async () => {
    const held = world('/read/one');

    held.session.navigate();
    await settled();

    expect(held.opened).toEqual([bookId('one')]);
    expect(held.listed).toEqual([bookId('one')]);
  });

  it('closes every part before opening the next book on a switch', async () => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();
    const closed = [
      vi.spyOn(held.session.reader, 'dispose'),
      vi.spyOn(held.session.captures, 'close'),
      vi.spyOn(held.session.shelf, 'dispose'),
      vi.spyOn(held.session.find, 'dispose'),
    ];

    go(held, '/read/two');
    await settled();

    expect(closed.map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1, 1]);
    expect(held.opened).toEqual([bookId('one'), bookId('two')]);
    expect(held.listed).toEqual([bookId('one'), bookId('two')]);
  });

  it('moves to an asked image within the open book without opening it again', async () => {
    const held = world('/read/one');
    held.session.navigate();
    await settled();
    const moved = vi.spyOn(held.session.reader, 'goToImage');

    go(held, '/read/one?image=3');

    expect(moved).toHaveBeenCalledWith(bookId('one'), imageIndex(3));
    expect(held.opened).toEqual([bookId('one')]);
  });

  it('opens nothing and moves nowhere when the address names the same place', async () => {
    const held = world('/read/one?image=3');
    held.session.navigate();
    await settled();
    const moved = vi.spyOn(held.session.reader, 'goToImage');

    go(held, '/read/one?image=3');
    await settled();

    expect(moved).not.toHaveBeenCalled();
    expect(held.opened).toEqual([bookId('one')]);
  });

  it('leaves for the library when the book is no longer there', async () => {
    const held = world('/read/gone');

    held.session.navigate();
    await settled();

    expect(held.left).toEqual([LIBRARY_AFTER_MISSING_BOOK]);
  });

  it('stays on a book that opened', async () => {
    const held = world('/read/one');

    held.session.navigate();
    await settled();

    expect(held.left).toEqual([]);
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
    const arriving = vi.spyOn(held.session.flow, 'arriveAt');

    held.session.navigate();
    await settled();

    expect(arriving).toHaveBeenCalledWith(bookId('one'), { cfi: 'epubcfi(/6/4)', quote: null });
  });

  it('asks the ebook reader for nothing when the address seeks no passage', async () => {
    const held = world('/read/one?image=2');
    const arriving = vi.spyOn(held.session.flow, 'arriveAt');

    held.session.navigate();
    await settled();

    expect(arriving).not.toHaveBeenCalled();
  });

  it('reads the book and the search query from the address', () => {
    const held = world('/read/one?image=1&find=%E6%B5%B7');

    expect(held.session.id).toBe(bookId('one'));
    expect(held.session.finding).toBe('海');
  });
});
