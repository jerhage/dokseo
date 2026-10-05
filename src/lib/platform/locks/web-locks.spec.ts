import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdingLock, holdingLockIfFree } from './web-locks';

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
