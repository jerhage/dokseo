import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createToaster } from '$lib/components/toaster.svelte';
import { SKIP_WAITING } from '$lib/platform/service-worker/shell-message';
import { SHELL_UPDATE_ACTION, SHELL_UPDATE_TITLE, ShellUpdates } from './shell-updates';
import { FakeShellContainer, FakeShellWorker } from './testing/fake-shell-worker';

let logged: MockInstance<typeof console.error>;

beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

describe('ShellUpdates', () => {
  it('shows one lasting info toast with a Reload action for a waiting worker', () => {
    const toaster = createToaster();
    const updates = new ShellUpdates(toaster, new FakeShellContainer(true), () => undefined);

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
    const updates = new ShellUpdates(toaster, container, () => undefined);
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
    const updates = new ShellUpdates(toaster, new FakeShellContainer(true), () => undefined);

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
    const updates = new ShellUpdates(toaster, container, reload);

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
    const updates = new ShellUpdates(toaster, container, () => undefined);

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
    );

    await updates.watch('/service-worker.js');

    expect(logged).toHaveBeenCalledWith('Unexpected failure (service-worker)', failure);
    expect(toaster.toasts).toEqual([]);
  });
});
