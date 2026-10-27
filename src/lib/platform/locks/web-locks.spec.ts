import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdingLock, holdingLockIfFree, tryHoldingLock } from './web-locks';

type Granted = (lock: { readonly name: string } | null) => unknown;

type Request = { readonly name: string; readonly options: unknown };

function lockManager(free: boolean) {
  const requests: Request[] = [];
  const request = (name: string, ...rest: unknown[]) => {
    const granted = rest.at(-1);
    if (typeof granted !== 'function') throw new Error('No callback');
    requests.push({ name, options: rest.length > 1 ? rest[0] : null });
    const run: Granted = (lock) => granted(lock);
    return Promise.resolve(run(free ? { name } : null));
  };
  return { requests, locks: { request } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('holdingLock', () => {
  it('runs the work under the named lock and answers what the work answers', async () => {
    const manager = lockManager(true);
    vi.stubGlobal('navigator', { locks: manager.locks });

    const answer = await holdingLock('book-files:b-1', () => Promise.resolve(7));

    expect(answer).toBe(7);
    expect(manager.requests).toEqual([{ name: 'book-files:b-1', options: null }]);
  });

  it('runs the work without a lock when the browser has no lock manager', async () => {
    vi.stubGlobal('navigator', {});

    const answer = await holdingLock('book-files:b-1', () => Promise.resolve(7));

    expect(answer).toBe(7);
  });
});

describe('holdingLockIfFree', () => {
  it('runs the work when the lock is free, asking only if it is available', async () => {
    const manager = lockManager(true);
    vi.stubGlobal('navigator', { locks: manager.locks });
    const work = vi.fn(() => Promise.resolve());

    await holdingLockIfFree('book-files:b-1', work);

    expect(work).toHaveBeenCalledOnce();
    expect(manager.requests).toEqual([{ name: 'book-files:b-1', options: { ifAvailable: true } }]);
  });

  it('skips the work when another holder has the lock', async () => {
    vi.stubGlobal('navigator', { locks: lockManager(false).locks });
    const work = vi.fn(() => Promise.resolve());

    await holdingLockIfFree('book-files:b-1', work);

    expect(work).not.toHaveBeenCalled();
  });

  it('skips the work when the browser has no lock manager', async () => {
    vi.stubGlobal('navigator', {});
    const work = vi.fn(() => Promise.resolve());

    await holdingLockIfFree('book-files:b-1', work);

    expect(work).not.toHaveBeenCalled();
  });
});

function exclusiveLockManager() {
  let tail: Promise<unknown> = Promise.resolve();
  let queued = 0;
  const request = (_name: string, ...rest: unknown[]) => {
    const granted = rest.at(-1);
    if (typeof granted !== 'function') throw new Error('No callback');
    const options = rest.length > 1 ? rest[0] : null;
    if (options !== null && queued > 0) return Promise.resolve(granted(null));
    queued += 1;
    const run = tail.then(async () => {
      try {
        return await granted({ name: _name });
      } finally {
        queued -= 1;
      }
    });
    tail = run.catch(() => undefined);
    return run;
  };
  return { request };
}

describe('tryHoldingLock', () => {
  it('answers what the work answers when the lock is free, asking only if it is available', async () => {
    const manager = lockManager(true);
    vi.stubGlobal('navigator', { locks: manager.locks });

    const attempt = await tryHoldingLock('dokseo-sync', () => Promise.resolve(7));

    expect(attempt).toEqual({ kind: 'held', value: 7 });
    expect(manager.requests).toEqual([{ name: 'dokseo-sync', options: { ifAvailable: true } }]);
  });

  it('reports busy without running the work when another holder has the lock', async () => {
    vi.stubGlobal('navigator', { locks: lockManager(false).locks });
    const work = vi.fn(() => Promise.resolve(7));

    const attempt = await tryHoldingLock('dokseo-sync', work);

    expect(attempt).toEqual({ kind: 'busy' });
    expect(work).not.toHaveBeenCalled();
  });

  it('reports busy when the browser has no lock manager', async () => {
    vi.stubGlobal('navigator', {});

    expect(await tryHoldingLock('dokseo-sync', () => Promise.resolve(7))).toEqual({ kind: 'busy' });
  });
});

describe('one lock across waiting and if-free runs', () => {
  it('makes a waiting run queue behind the holder and an if-free run report busy meanwhile', async () => {
    vi.stubGlobal('navigator', { locks: exclusiveLockManager() });
    const order: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = holdingLock('dokseo-sync', async () => {
      order.push('first start');
      await gate;
      order.push('first end');
    });
    const waiting = holdingLock('dokseo-sync', async () => {
      order.push('second');
    });
    const attempt = await tryHoldingLock('dokseo-sync', () => Promise.resolve());
    release();
    await Promise.all([first, waiting]);

    expect(attempt).toEqual({ kind: 'busy' });
    expect(order).toEqual(['first start', 'first end', 'second']);
  });
});
