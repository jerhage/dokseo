import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createToaster } from '$lib/components/toaster.svelte';
import { SKIP_WAITING } from '$lib/platform/service-worker/shell-message';
import {
  SHELL_UPDATE_ACTION,
  SHELL_UPDATE_TITLE,
  ShellUpdates,
  UPDATE_CHECK_TITLES,
  checkAfterRequest,
  checkBeforeRequest,
  foundProgress,
  shellCheckState,
} from './shell-updates';
import { FakeShellContainer, FakeShellWorker } from './testing/fake-shell-worker';
import { UNEXPECTED_FAILURE_TITLE } from './unexpected-failure';

let logged: MockInstance<typeof console.error>;

function online(): boolean {
  return true;
}

function offline(): boolean {
  return false;
}

beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

describe('ShellUpdates', () => {
  it('shows one lasting info toast with a Reload action for a waiting worker', () => {
    const toaster = createToaster();
    const updates = new ShellUpdates(
      toaster,
      new FakeShellContainer(true),
      () => undefined,
      online,
    );

    updates.offer(new FakeShellWorker('installed'));

    expect(toaster.toasts).toHaveLength(1);
    expect(toaster.toasts[0]).toMatchObject({
      title: SHELL_UPDATE_TITLE,
      variant: 'info',
      duration: { kind: 'persistent' },
      action: { label: SHELL_UPDATE_ACTION },
    });
  });

  it('keeps one toast while it shows and points its action at the latest worker', () => {
    const toaster = createToaster();
    const container = new FakeShellContainer(true);
    const updates = new ShellUpdates(toaster, container, () => undefined, online);
    const older = new FakeShellWorker('installed');
    const newer = new FakeShellWorker('installed');

    updates.offer(older);
    updates.offer(newer);
    const shown = toaster.toasts[0];
    if (shown === undefined) throw new Error('no toast');
    toaster.act(shown.id);

    expect(toaster.toasts.filter((toast) => toast.phase === 'shown')).toHaveLength(0);
    expect(older.posted).toEqual([]);
    expect(newer.posted).toEqual([SKIP_WAITING]);
  });

  it('shows the toast again for a worker found after the first was dismissed', () => {
    const toaster = createToaster();
    const updates = new ShellUpdates(
      toaster,
      new FakeShellContainer(true),
      () => undefined,
      online,
    );

    updates.offer(new FakeShellWorker('installed'));
    const first = toaster.toasts[0];
    if (first === undefined) throw new Error('no toast');
    toaster.dismiss(first.id);
    updates.offer(new FakeShellWorker('installed'));

    expect(toaster.toasts.filter((toast) => toast.phase === 'shown')).toHaveLength(1);
  });

  it('reloads only after Reload is chosen and control has changed', () => {
    const toaster = createToaster();
    const container = new FakeShellContainer(true);
    const reload = vi.fn();
    const updates = new ShellUpdates(toaster, container, reload, online);

    updates.offer(new FakeShellWorker('installed'));
    container.changeController();
    expect(reload).not.toHaveBeenCalled();

    const shown = toaster.toasts[0];
    if (shown === undefined) throw new Error('no toast');
    toaster.act(shown.id);
    expect(reload).not.toHaveBeenCalled();
    container.changeController();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('offers the worker the registration finds waiting', async () => {
    const toaster = createToaster();
    const container = new FakeShellContainer(true);
    container.registration.waiting = new FakeShellWorker('installed');
    const updates = new ShellUpdates(toaster, container, () => undefined, online);

    await updates.watch('/service-worker.js');

    expect(toaster.toasts.map((toast) => toast.title)).toEqual([SHELL_UPDATE_TITLE]);
  });

  it('logs a failed registration and shows nothing', async () => {
    const toaster = createToaster();
    const failure = new DOMException('Not allowed', 'SecurityError');
    const updates = new ShellUpdates(
      toaster,
      new FakeShellContainer(false, failure),
      () => undefined,
      online,
    );

    await updates.watch('/service-worker.js');

    expect(logged).toHaveBeenCalledWith('Unexpected failure (service-worker)', failure);
    expect(toaster.toasts).toEqual([]);
  });

  it('asks the registration for a newer worker when rechecked after watching', async () => {
    const container = new FakeShellContainer(true);
    const updates = new ShellUpdates(createToaster(), container, () => undefined, online);

    updates.recheck();
    await updates.watch('/service-worker.js');
    updates.recheck();

    expect(container.registration.updates).toBe(1);
  });

  it('skips the update request while the device is offline', async () => {
    const container = new FakeShellContainer(true);
    const updates = new ShellUpdates(createToaster(), container, () => undefined, offline);

    await updates.watch('/service-worker.js');
    updates.recheck();

    expect(container.registration.updates).toBe(0);
  });

  it('logs nothing when the update request fails to reach the network', async () => {
    const container = new FakeShellContainer(true);
    const updates = new ShellUpdates(createToaster(), container, () => undefined, online);
    await updates.watch('/service-worker.js');

    container.registration.updateFailure = new TypeError('Failed to fetch');
    updates.recheck();
    container.registration.updateFailure = new DOMException('Offline', 'NetworkError');
    updates.recheck();
    await new Promise((settle) => setTimeout(settle, 0));

    expect(logged).not.toHaveBeenCalled();
  });

  it('logs an update request that fails for any other reason', async () => {
    const container = new FakeShellContainer(true);
    const updates = new ShellUpdates(createToaster(), container, () => undefined, online);
    await updates.watch('/service-worker.js');
    const failure = new DOMException('Not allowed', 'SecurityError');

    container.registration.updateFailure = failure;
    updates.recheck();

    await vi.waitFor(() =>
      expect(logged).toHaveBeenCalledWith('Unexpected failure (service-worker)', failure),
    );
  });
});

type Watched = {
  readonly toaster: ReturnType<typeof createToaster>;
  readonly container: FakeShellContainer;
  readonly updates: ShellUpdates;
};

function shownTitles(toaster: ReturnType<typeof createToaster>): readonly string[] {
  return toaster.toasts.filter((toast) => toast.phase === 'shown').map((toast) => toast.title);
}

async function watched(isOnline: () => boolean): Promise<Watched> {
  const toaster = createToaster();
  const container = new FakeShellContainer(true);
  const updates = new ShellUpdates(toaster, container, () => undefined, isOnline);
  await updates.watch('/service-worker.js');
  return { toaster, container, updates };
}

describe('shellCheckState', () => {
  it('reports an absent registration as unregistered', () => {
    expect(shellCheckState(null)).toEqual({ kind: 'unregistered' });
  });

  it('reports the waiting worker of a registration that holds one', () => {
    const registration = new FakeShellContainer(true).registration;
    const waiting = new FakeShellWorker('installed');
    registration.waiting = waiting;

    expect(shellCheckState(registration)).toEqual({ kind: 'update-waiting', waiting });
  });

  it('reports a registration without a waiting worker as current', () => {
    const registration = new FakeShellContainer(true).registration;

    expect(shellCheckState(registration)).toEqual({ kind: 'current', registration });
  });
});

describe('checkBeforeRequest', () => {
  const registration = new FakeShellContainer(true).registration;
  const waiting = new FakeShellWorker('installed');

  it('answers unavailable for an unregistered app, online or not', () => {
    const unavailable = { kind: 'answered', check: { kind: 'unavailable' } };

    expect(checkBeforeRequest({ kind: 'unregistered' }, true)).toEqual(unavailable);
    expect(checkBeforeRequest({ kind: 'unregistered' }, false)).toEqual(unavailable);
  });

  it('answers with the waiting worker before it looks at the network', () => {
    const ready = { kind: 'answered', check: { kind: 'already-waiting', waiting } };

    expect(checkBeforeRequest({ kind: 'update-waiting', waiting }, true)).toEqual(ready);
    expect(checkBeforeRequest({ kind: 'update-waiting', waiting }, false)).toEqual(ready);
  });

  it('answers offline without a request when the device has no network', () => {
    expect(checkBeforeRequest({ kind: 'current', registration }, false)).toEqual({
      kind: 'answered',
      check: { kind: 'offline' },
    });
  });

  it('asks for a request when the app is current and online', () => {
    expect(checkBeforeRequest({ kind: 'current', registration }, true)).toEqual({
      kind: 'request',
      registration,
    });
  });
});

describe('foundProgress', () => {
  it('names a found worker still installing as downloading', () => {
    expect(foundProgress('parsed')).toBe('downloading');
    expect(foundProgress('installing')).toBe('downloading');
  });

  it('names a found worker that finished installing as installed', () => {
    expect(foundProgress('installed')).toBe('installed');
    expect(foundProgress('activating')).toBe('installed');
    expect(foundProgress('activated')).toBe('installed');
  });

  it('names a found worker that turned redundant as a failed download', () => {
    expect(foundProgress('redundant')).toBe('download-failed');
  });
});

describe('checkAfterRequest', () => {
  it('answers up to date when the request found no newer worker', () => {
    expect(checkAfterRequest({ kind: 'resolved', found: null })).toEqual({ kind: 'up-to-date' });
  });

  it('answers found with the newer worker the request started installing', () => {
    const found = new FakeShellWorker('installing');

    expect(checkAfterRequest({ kind: 'resolved', found })).toEqual({ kind: 'found', found });
  });

  it('answers a failed download for a found worker that is already redundant', () => {
    const found = new FakeShellWorker('redundant');

    expect(checkAfterRequest({ kind: 'resolved', found })).toEqual({ kind: 'download-failed' });
  });

  it('answers unreachable for a request that failed to reach the network', () => {
    expect(
      checkAfterRequest({ kind: 'rejected', error: new TypeError('Failed to fetch') }),
    ).toEqual({ kind: 'unreachable' });
    expect(
      checkAfterRequest({ kind: 'rejected', error: new DOMException('Offline', 'NetworkError') }),
    ).toEqual({ kind: 'unreachable' });
  });

  it('answers unexpected with the error for any other rejection', () => {
    const error = new DOMException('Not allowed', 'SecurityError');

    expect(checkAfterRequest({ kind: 'rejected', error })).toEqual({ kind: 'unexpected', error });
  });
});

describe('ShellUpdates.checkNow', () => {
  it('reports an up-to-date app with one success toast', async () => {
    const { toaster, container, updates } = await watched(online);

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'up-to-date' });
    expect(container.registration.updates).toBe(1);
    expect(toaster.toasts).toMatchObject([
      { title: UPDATE_CHECK_TITLES.upToDate, variant: 'success' },
    ]);
  });

  it('shows the download, then the Reload toast once the found worker is installed', async () => {
    const { toaster, container, updates } = await watched(online);
    const found = new FakeShellWorker('installing');
    container.registration.updateFinds = found;

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'found', found });
    expect(shownTitles(toaster)).toEqual([UPDATE_CHECK_TITLES.downloading]);

    found.become('installed');

    expect(shownTitles(toaster)).toEqual([SHELL_UPDATE_TITLE]);
    const offered = toaster.toasts.find((toast) => toast.phase === 'shown');
    if (offered === undefined) throw new Error('no toast');
    toaster.act(offered.id);
    expect(found.posted).toEqual([SKIP_WAITING]);
  });

  it('reports a failed download when the found worker turns redundant before it installs', async () => {
    const { toaster, container, updates } = await watched(online);
    const found = new FakeShellWorker('installing');
    container.registration.updateFinds = found;

    await updates.checkNow();
    found.become('redundant');

    expect(shownTitles(toaster)).toEqual([UPDATE_CHECK_TITLES.downloadFailed]);
    expect(toaster.toasts.at(-1)?.variant).toBe('danger');
  });

  it('reports no failure for a found worker that turns redundant after it installed', async () => {
    const { toaster, container, updates } = await watched(online);
    const found = new FakeShellWorker('installing');
    container.registration.updateFinds = found;

    await updates.checkNow();
    found.become('installed');
    found.become('redundant');

    expect(shownTitles(toaster)).toEqual([SHELL_UPDATE_TITLE]);
  });

  it('offers a worker already waiting without a request, and Reload applies it', async () => {
    const toaster = createToaster();
    const container = new FakeShellContainer(false);
    const waiting = new FakeShellWorker('installed');
    container.registration.waiting = waiting;
    const updates = new ShellUpdates(toaster, container, () => undefined, online);
    await updates.watch('/service-worker.js');

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'already-waiting', waiting });
    expect(container.registration.updates).toBe(0);
    expect(toaster.toasts).toMatchObject([
      { title: UPDATE_CHECK_TITLES.ready, variant: 'info', action: { label: SHELL_UPDATE_ACTION } },
    ]);
    const ready = toaster.toasts[0];
    if (ready === undefined) throw new Error('no toast');
    toaster.act(ready.id);
    expect(waiting.posted).toEqual([SKIP_WAITING]);
  });

  it('warns of a missing connection without a request while offline', async () => {
    const { toaster, container, updates } = await watched(offline);

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'offline' });
    expect(container.registration.updates).toBe(0);
    expect(toaster.toasts).toMatchObject([
      { title: UPDATE_CHECK_TITLES.offline, variant: 'warning' },
    ]);
  });

  it('warns of an unreachable server and logs nothing when the request fails to reach the network', async () => {
    const { toaster, container, updates } = await watched(online);
    container.registration.updateFailure = new TypeError('Failed to fetch');

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'unreachable' });
    expect(toaster.toasts).toMatchObject([
      { title: UPDATE_CHECK_TITLES.unreachable, variant: 'warning' },
    ]);
    expect(logged).not.toHaveBeenCalled();
  });

  it('reports updates as unavailable without a service worker container', async () => {
    const toaster = createToaster();
    const updates = new ShellUpdates(toaster, null, () => undefined, online);
    await updates.watch('/service-worker.js');

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'unavailable' });
    expect(toaster.toasts).toMatchObject([
      { title: UPDATE_CHECK_TITLES.unavailable, variant: 'info' },
    ]);
  });

  it('reports updates as unavailable when the registration failed', async () => {
    const failure = new DOMException('Not allowed', 'SecurityError');
    const updates = new ShellUpdates(
      createToaster(),
      new FakeShellContainer(false, failure),
      () => undefined,
      online,
    );
    await updates.watch('/service-worker.js');

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'unavailable' });
  });

  it('logs any other failed request and shows it as an unexpected failure', async () => {
    const { toaster, container, updates } = await watched(online);
    const failure = new DOMException('Not allowed', 'SecurityError');
    container.registration.updateFailure = failure;

    const check = await updates.checkNow();

    expect(check).toEqual({ kind: 'unexpected', error: failure });
    expect(logged).toHaveBeenCalledWith('Unexpected failure (service-worker)', failure);
    expect(toaster.toasts).toMatchObject([
      { title: UNEXPECTED_FAILURE_TITLE, message: 'Not allowed', variant: 'danger' },
    ]);
  });
});
