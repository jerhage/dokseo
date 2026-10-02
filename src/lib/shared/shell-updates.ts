import type { ToastId, Toaster } from '$lib/components/toaster.svelte';
import {
  applyShellUpdate,
  watchShellWorker,
} from '$lib/platform/service-worker/shell-registration';
import type {
  ShellRegistration,
  ShellWorker,
  ShellWorkerContainer,
} from '$lib/platform/service-worker/shell-registration';
import { logUnexpected } from './unexpected-failure';

type UpdateToaster = Pick<Toaster, 'show' | 'toasts'>;

const SHELL_UPDATE_TITLE = 'A new version is available';

const SHELL_UPDATE_ACTION = 'Reload';

const SHELL_WORKER_URL = '/service-worker.js';

const SHELL_RECHECK_MS = 30 * 60 * 1000;

class ShellUpdates {
  #toaster: UpdateToaster;
  #container: ShellWorkerContainer;
  #reload: () => void;
  #waiting: ShellWorker | null = null;
  #shown: ToastId | null = null;
  #registration: ShellRegistration | null = null;

  constructor(toaster: UpdateToaster, container: ShellWorkerContainer, reload: () => void) {
    this.#toaster = toaster;
    this.#container = container;
    this.#reload = reload;
  }

  watch(url: string): Promise<void> {
    return watchShellWorker(this.#container, url, (waiting) => this.offer(waiting)).then(
      (registration) => {
        this.#registration = registration;
      },
      (error: unknown) => logUnexpected('service-worker', error),
    );
  }

  recheck(): void {
    this.#registration?.update().catch((error: unknown) => logUnexpected('service-worker', error));
  }

  offer(waiting: ShellWorker): void {
    this.#waiting = waiting;
    const shown = this.#shown;
    if (
      shown !== null &&
      this.#toaster.toasts.some((toast) => toast.id === shown && toast.phase === 'shown')
    )
      return;

    this.#shown = this.#toaster.show({
      title: SHELL_UPDATE_TITLE,
      action: { label: SHELL_UPDATE_ACTION, run: () => this.#apply() },
    });
  }

  #apply(): void {
    const waiting = this.#waiting;
    if (waiting === null) return;
    applyShellUpdate(this.#container, waiting, this.#reload);
  }
}

function watchShellUpdates(toaster: UpdateToaster): void {
  if (!('serviceWorker' in navigator)) return;

  const updates = new ShellUpdates(toaster, navigator.serviceWorker, () => location.reload());
  void updates.watch(SHELL_WORKER_URL);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') updates.recheck();
  });
  setInterval(() => updates.recheck(), SHELL_RECHECK_MS);
}

export {
  SHELL_RECHECK_MS,
  SHELL_UPDATE_ACTION,
  SHELL_UPDATE_TITLE,
  SHELL_WORKER_URL,
  ShellUpdates,
  watchShellUpdates,
};
export type { UpdateToaster };
