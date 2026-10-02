import { describe, expect, it, vi } from 'vitest';
import { FakeShellContainer, FakeShellWorker } from '$lib/shared/testing/fake-shell-worker';
import { SKIP_WAITING } from './shell-message';
import { applyShellUpdate, watchShellWorker } from './shell-registration';
import type { ShellWorker } from './shell-registration';

const URL_ASKED = '/service-worker.js';

describe('watchShellWorker', () => {
  it('registers the worker script it is given', async () => {
    const container = new FakeShellContainer(false);

    await watchShellWorker(container, URL_ASKED, () => undefined);

    expect(container.registered).toEqual([URL_ASKED]);
  });

  it('offers a worker already waiting behind the one in control', async () => {
    const container = new FakeShellContainer(true);
    const waiting = new FakeShellWorker('installed');
    container.registration.waiting = waiting;
    const offered: ShellWorker[] = [];

    await watchShellWorker(container, URL_ASKED, (worker) => offered.push(worker));

    expect(offered).toEqual([waiting]);
  });

  it('offers a newly found worker once it has installed', async () => {
    const container = new FakeShellContainer(true);
    const offered: ShellWorker[] = [];
    await watchShellWorker(container, URL_ASKED, (worker) => offered.push(worker));
    const found = new FakeShellWorker('installing');

    container.registration.install(found);
    expect(offered).toEqual([]);
    found.become('installed');

    expect(offered).toEqual([found]);
  });

  it('offers nothing for the first worker of a page no worker controls', async () => {
    const container = new FakeShellContainer(false);
    const onWaiting = vi.fn();
    await watchShellWorker(container, URL_ASKED, onWaiting);
    const first = new FakeShellWorker('installing');

    container.registration.install(first);
    first.become('installed');

    expect(onWaiting).not.toHaveBeenCalled();
  });

  it('offers nothing for a found worker that failed to install', async () => {
    const container = new FakeShellContainer(true);
    const onWaiting = vi.fn();
    await watchShellWorker(container, URL_ASKED, onWaiting);
    const found = new FakeShellWorker('installing');

    container.registration.install(found);
    found.become('redundant');

    expect(onWaiting).not.toHaveBeenCalled();
  });

  it('rejects with the registration failure', async () => {
    const failure = new DOMException('Not allowed', 'SecurityError');
    const container = new FakeShellContainer(false, failure);

    await expect(watchShellWorker(container, URL_ASKED, () => undefined)).rejects.toBe(failure);
  });
});

describe('applyShellUpdate', () => {
  it('asks the waiting worker to skip waiting and reloads once control changes', () => {
    const container = new FakeShellContainer(true);
    const waiting = new FakeShellWorker('installed');
    const reload = vi.fn();

    applyShellUpdate(container, waiting, reload);

    expect(waiting.posted).toEqual([SKIP_WAITING]);
    expect(reload).not.toHaveBeenCalled();
    container.changeController();
    expect(reload).toHaveBeenCalledTimes(1);
    container.changeController();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at once when the worker has already left waiting', () => {
    for (const state of ['activating', 'activated', 'redundant'] as const) {
      const container = new FakeShellContainer(true);
      const waiting = new FakeShellWorker(state);
      const reload = vi.fn();

      applyShellUpdate(container, waiting, reload);

      expect(waiting.posted).toEqual([]);
      expect(reload).toHaveBeenCalledTimes(1);
    }
  });
});
