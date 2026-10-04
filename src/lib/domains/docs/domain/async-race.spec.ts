import { afterEach, describe, expect, it, vi } from 'vitest';
import { RaceSearch, answerFor, delayedAnswer } from './async-race';
import type { RaceEvent, RaceRequest, RaceStrategy } from './async-race';

type Pending = {
  readonly request: RaceRequest;
  readonly signal: AbortSignal;
  readonly answer: () => void;
};

function harness(strategy: RaceStrategy) {
  const pending: Pending[] = [];
  const shown: string[] = [];
  const events: RaceEvent[] = [];
  const search = new RaceSearch(
    strategy,
    (request, signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
        pending.push({ request, signal, answer: () => resolve(answerFor(request.query)) });
      }),
    {
      show: (request) => shown.push(request.query),
      record: (event) => events.push(event),
    },
  );
  return { search, pending, shown, events };
}

async function sendBothAnswerFirstLast(strategy: RaceStrategy) {
  const world = harness(strategy);
  const first = world.search.send('ha', 1500);
  const second = world.search.send('harbor', 300);
  world.pending[1]?.answer();
  await second;
  world.pending[0]?.answer();
  await first;
  return world;
}

describe('RaceSearch', () => {
  it('shows the earlier answer last when nothing guards it', async () => {
    const world = await sendBothAnswerFirstLast('naive');

    expect(world.shown).toEqual(['harbor', 'ha']);
  });

  it('drops an answer whose request id is not the latest', async () => {
    const world = await sendBothAnswerFirstLast('request-id');

    expect(world.shown).toEqual(['harbor']);
    expect(world.events.map((event) => event.kind)).toEqual(['sent', 'sent', 'shown', 'dropped']);
  });

  it('aborts the earlier request when a later one starts', async () => {
    const world = await sendBothAnswerFirstLast('abort');

    expect(world.pending[0]?.signal.aborted).toBe(true);
    expect(world.shown).toEqual(['harbor']);
    expect(world.events.map((event) => event.kind)).toEqual(['sent', 'sent', 'aborted', 'shown']);
  });

  it('shows both answers in order when the earlier one is also the faster one', async () => {
    const world = harness('naive');
    const first = world.search.send('ha', 300);
    const second = world.search.send('harbor', 1500);
    world.pending[0]?.answer();
    await first;
    world.pending[1]?.answer();
    await second;

    expect(world.shown).toEqual(['ha', 'harbor']);
  });

  it('rethrows a failure that no abort caused', async () => {
    const search = new RaceSearch('abort', () => Promise.reject(new Error('offline')), {
      show: () => undefined,
      record: () => undefined,
    });

    await expect(search.send('ha', 0)).rejects.toThrow('offline');
  });
});

describe('delayedAnswer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers with the matching titles after the delay', async () => {
    vi.useFakeTimers();
    const answer = delayedAnswer(
      { id: 1, query: 'harb', delayMs: 500 },
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(500);

    await expect(answer).resolves.toBe('Harbor Lights');
  });

  it('rejects with the abort reason and clears its timer', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const answer = delayedAnswer({ id: 1, query: 'ha', delayMs: 500 }, controller.signal);
    controller.abort();

    await expect(answer).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects at once for a signal that is already aborted', async () => {
    await expect(
      delayedAnswer({ id: 1, query: 'ha', delayMs: 500 }, AbortSignal.abort()),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
