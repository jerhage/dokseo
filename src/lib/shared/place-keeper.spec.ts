import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookId, imageIndex } from './ids';
import type { Notice } from './notice';
import { PLACE_FAILED, PLACE_KEPT, PLACE_SAVE_DELAY_MS, PlaceKeeper } from './place-keeper';
import type { AfterFailure, PlaceSaved } from './place-keeper';
import { imagePlace, textPlace } from './reading-place';
import type { ImagePlace } from './reading-place';
type Bench = {
  readonly keeper: PlaceKeeper<ImagePlace>;
  readonly saved: ImagePlace[];
  readonly settled: ImagePlace[];
  readonly notices: Notice[];
  answer: () => Promise<PlaceSaved>;
  generation: number;
};

const BOOK = bookId('one');

const REFUSED: PlaceSaved = { kind: 'refused', message: 'described denied' };

function place(index: number): ImagePlace {
  return imagePlace(imageIndex(index));
}

function bench(afterFailure: AfterFailure = 'keeps-place'): Bench {
  const saved: ImagePlace[] = [];
  const settled: ImagePlace[] = [];
  const notices: Notice[] = [];
  const held: Bench = {
    saved,
    settled,
    notices,
    answer: () => Promise.resolve(PLACE_KEPT),
    generation: 0,
    keeper: new PlaceKeeper<ImagePlace>({
      save: (_id, at) => {
        saved.push(at);
        return held.answer();
      },
      notify: (notice) => notices.push(notice),
      afterFailure,
      generation: () => held.generation,
      onSettle: (at) => settled.push(at),
    }),
  };
  return held;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlaceKeeper', () => {
  it('saves only the last place scheduled within the delay', async () => {
    const { keeper, saved } = bench();

    keeper.schedule(BOOK, place(1));
    keeper.schedule(BOOK, place(2));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS - 1);
    expect(saved).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(saved).toEqual([place(2)]);
  });

  it('tells the owner when a scheduled place settles, even one already stored', async () => {
    const { keeper, saved, settled } = bench();
    keeper.assumeStored(place(3));

    keeper.schedule(BOOK, place(3));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(settled).toEqual([place(3)]);
    expect(saved).toEqual([]);
  });

  it('saves a waiting place at once on a flush, and nothing when the timer would have fired', async () => {
    const { keeper, saved } = bench();

    keeper.schedule(BOOK, place(4));
    keeper.flush();
    expect(saved).toEqual([place(4)]);

    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);
    expect(saved).toEqual([place(4)]);
  });

  it('reports the waiting place before the stored one', () => {
    const { keeper } = bench();
    keeper.assumeStored(place(1));
    expect(keeper.latest).toEqual(place(1));

    keeper.schedule(BOOK, place(2));
    expect(keeper.latest).toEqual(place(2));
  });

  it('reports a run of failures once, and again after a save succeeds', async () => {
    const run = bench();
    run.answer = () => Promise.resolve(REFUSED);

    await run.keeper.persist(BOOK, place(1));
    await run.keeper.persist(BOOK, place(2));
    expect(run.notices).toEqual([
      { tone: 'danger', title: PLACE_FAILED, message: 'described denied' },
    ]);

    run.answer = () => Promise.resolve(PLACE_KEPT);
    await run.keeper.persist(BOOK, place(3));
    run.answer = () => Promise.reject(new Error('gone'));
    await run.keeper.persist(BOOK, place(4));

    expect(run.notices.map((notice) => notice.title)).toEqual([PLACE_FAILED, PLACE_FAILED]);
    expect(run.notices[1]?.message).toContain('gone');
  });

  it('reports the failures again after a restart', async () => {
    const run = bench();
    run.answer = () => Promise.resolve(REFUSED);
    await run.keeper.persist(BOOK, place(1));

    run.keeper.restart();
    await run.keeper.persist(BOOK, place(2));

    expect(run.notices).toHaveLength(2);
  });

  it('ignores the answer to a save the owner has moved past', async () => {
    const run = bench();
    run.answer = () => Promise.resolve(REFUSED);

    const saving = run.keeper.persist(BOOK, place(1));
    run.generation += 1;
    await saving;

    expect(run.notices).toEqual([]);
  });

  it('keeps a place that failed to save as stored when told to keep it', async () => {
    const run = bench('keeps-place');
    run.answer = () => Promise.resolve(REFUSED);
    await run.keeper.persist(BOOK, place(5));

    run.keeper.schedule(BOOK, place(5));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(run.saved).toEqual([place(5)]);
  });

  it('forgets a place that failed to save when told to, so the next save of it retries', async () => {
    const run = bench('forgets-place');
    run.answer = () => Promise.resolve(REFUSED);
    await run.keeper.persist(BOOK, place(5));

    run.keeper.schedule(BOOK, place(5));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(run.saved).toEqual([place(5), place(5)]);
  });

  it('treats an unchanged text place as already stored', async () => {
    const saved: unknown[] = [];
    const keeper = new PlaceKeeper({
      save: (_id, at) => {
        saved.push(at);
        return Promise.resolve(PLACE_KEPT);
      },
      notify: () => undefined,
      afterFailure: 'forgets-place',
    });
    keeper.assumeStored(textPlace('epubcfi(/6/2)', 0.1));

    keeper.schedule(BOOK, textPlace('epubcfi(/6/2)', 0.1));
    await vi.advanceTimersByTimeAsync(PLACE_SAVE_DELAY_MS);

    expect(saved).toEqual([]);
  });
});
