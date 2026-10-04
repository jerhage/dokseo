import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaitLedger, waitForEvent } from './event-wait';
import type { WaitEnd } from './event-wait';

function settledYet(promise: Promise<WaitEnd>): () => WaitEnd | null {
  let ended: WaitEnd | null = null;
  void promise.then((end) => {
    ended = end;
  });
  return () => ended;
}

describe('waitForEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never settles without a timeout when the event never fires', async () => {
    const ledger = new WaitLedger(() => undefined);
    const ended = settledYet(waitForEvent(ledger, new EventTarget(), 'ready', 1000, 'forever'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(ended()).toBeNull();
    expect(ledger.holdings).toEqual({ listeners: 1, timers: 0 });
  });

  it('times out with a race but leaves the listener attached', async () => {
    const ledger = new WaitLedger(() => undefined);
    const waiting = waitForEvent(ledger, new EventTarget(), 'ready', 1000, 'race');
    await vi.advanceTimersByTimeAsync(1000);

    await expect(waiting).resolves.toEqual({ kind: 'timed-out' });
    expect(ledger.holdings).toEqual({ listeners: 1, timers: 0 });
  });

  it('leaves the timer pending when the event wins a plain race', async () => {
    const ledger = new WaitLedger(() => undefined);
    const target = new EventTarget();
    const waiting = waitForEvent(ledger, target, 'ready', 1000, 'race');
    target.dispatchEvent(new Event('ready'));

    await expect(waiting).resolves.toEqual({ kind: 'arrived' });
    expect(ledger.holdings).toEqual({ listeners: 0, timers: 1 });
  });

  it('releases the listener and the timer whichever side wins, with clean-up', async () => {
    const ledger = new WaitLedger(() => undefined);
    const target = new EventTarget();
    const timedOut = waitForEvent(ledger, target, 'ready', 1000, 'race-and-clean-up');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(timedOut).resolves.toEqual({ kind: 'timed-out' });

    const arrived = waitForEvent(ledger, target, 'ready', 1000, 'race-and-clean-up');
    target.dispatchEvent(new Event('ready'));
    await expect(arrived).resolves.toEqual({ kind: 'arrived' });

    expect(ledger.holdings).toEqual({ listeners: 0, timers: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports each change of what the waits hold', async () => {
    const seen: string[] = [];
    const ledger = new WaitLedger(({ listeners, timers }) => seen.push(`${listeners}/${timers}`));
    const waiting = waitForEvent(ledger, new EventTarget(), 'ready', 10, 'race-and-clean-up');
    await vi.advanceTimersByTimeAsync(10);
    await waiting;

    expect(seen).toEqual(['1/0', '1/1', '1/0', '0/0']);
  });
});
