import { describe, expect, it } from 'vitest';
import { createScrollRestore } from './scroll-memory';

function setup(saved: number) {
  const kept: number[] = [];
  const scrolled: number[] = [];
  const restore = createScrollRestore(
    saved,
    (top) => kept.push(top),
    () => Promise.resolve(),
  );
  restore.bind({ read: () => 0, scrollTo: (top) => scrolled.push(top) });
  return { restore, kept, scrolled };
}

describe('createScrollRestore', () => {
  it('scrolls to the saved position once the feed is shown', async () => {
    const { restore, scrolled } = setup(480);

    await restore.settled();
    await restore.settled();

    expect(scrolled).toEqual([480]);
  });

  it('scrolls nowhere when nothing was saved', async () => {
    const { restore, scrolled } = setup(0);

    await restore.settled();

    expect(scrolled).toEqual([]);
  });

  it('keeps no position while the feed is still loading', () => {
    const { restore, kept } = setup(480);

    restore.track(0);

    expect(kept).toEqual([]);
  });

  it('keeps the position the reader scrolls to after the feed is shown', async () => {
    const { restore, kept } = setup(0);
    await restore.settled();

    restore.track(300);

    expect(kept).toEqual([300]);
  });

  it('scrolls nowhere once the scroller is released', async () => {
    const kept: number[] = [];
    const scrolled: number[] = [];
    const restore = createScrollRestore(
      200,
      (top) => kept.push(top),
      () => Promise.resolve(),
    );
    const release = restore.bind({ read: () => 0, scrollTo: (top) => scrolled.push(top) });
    release();

    await restore.settled();

    expect(scrolled).toEqual([]);
  });
});
