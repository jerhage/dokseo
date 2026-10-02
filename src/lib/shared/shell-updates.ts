import { match } from 'ts-pattern';
import type { ToastId, ToastOptions, Toaster } from '$lib/components/toaster.svelte';
import {
  applyShellUpdate,
  watchShellWorker,
} from '$lib/platform/service-worker/shell-registration';
import type {
  ShellRegistration,
  ShellWorker,
  ShellWorkerContainer,
} from '$lib/platform/service-worker/shell-registration';
import { describeCause } from './cause';
import { UNEXPECTED_FAILURE_TITLE, logUnexpected } from './unexpected-failure';

type UpdateToaster = Pick<Toaster, 'show' | 'toasts' | 'dismiss'>;

type ShellCheckState =
  | { readonly kind: 'unregistered' }
  | { readonly kind: 'current'; readonly registration: ShellRegistration }
  | { readonly kind: 'update-waiting'; readonly waiting: ShellWorker };

type ManualUpdateCheck =
  | { readonly kind: 'up-to-date' }
  | { readonly kind: 'found'; readonly found: ShellWorker }
  | { readonly kind: 'already-waiting'; readonly waiting: ShellWorker }
  | { readonly kind: 'offline' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'download-failed' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'unexpected'; readonly error: unknown };

type UpdateCheckStart =
  | { readonly kind: 'answered'; readonly check: ManualUpdateCheck }
  | { readonly kind: 'request'; readonly registration: ShellRegistration };

type UpdateSettlement =
  | { readonly kind: 'resolved'; readonly found: ShellWorker | null }
  | { readonly kind: 'rejected'; readonly error: unknown };

type FoundProgress = 'downloading' | 'installed' | 'download-failed';

const SHELL_UPDATE_TITLE = 'A new version is available';

const SHELL_UPDATE_ACTION = 'Reload';

const SHELL_WORKER_URL = '/service-worker.js';

const SHELL_RECHECK_MS = 30 * 60 * 1000;

const UPDATE_CHECK_TITLES = {
  upToDate: 'The app is up to date.',
  downloading: 'Downloading the new version…',
  ready: 'A new version is ready',
  offline: 'There is no network connection. Connect and try again.',
  unreachable: 'The update server could not be reached. Try again later.',
  downloadFailed: 'The new version could not be downloaded. Try again.',
  unavailable: 'Updates are not available in this browser or mode.',
} as const;

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  return error instanceof DOMException && error.name === 'NetworkError';
}

function shellCheckState(registration: ShellRegistration | null): ShellCheckState {
  if (registration === null) return { kind: 'unregistered' };
  if (registration.waiting !== null)
    return { kind: 'update-waiting', waiting: registration.waiting };
  return { kind: 'current', registration };
}

function checkBeforeRequest(state: ShellCheckState, online: boolean): UpdateCheckStart {
  return match(state)
    .returnType<UpdateCheckStart>()
    .with({ kind: 'unregistered' }, () => ({ kind: 'answered', check: { kind: 'unavailable' } }))
    .with({ kind: 'update-waiting' }, ({ waiting }) => ({
      kind: 'answered',
      check: { kind: 'already-waiting', waiting },
    }))
    .with({ kind: 'current' }, ({ registration }) =>
      online ? { kind: 'request', registration } : { kind: 'answered', check: { kind: 'offline' } },
    )
    .exhaustive();
}

function foundProgress(state: ServiceWorkerState): FoundProgress {
  return match(state)
    .returnType<FoundProgress>()
    .with('parsed', 'installing', () => 'downloading')
    .with('installed', 'activating', 'activated', () => 'installed')
    .with('redundant', () => 'download-failed')
    .exhaustive();
}

function checkAfterRequest(settlement: UpdateSettlement): ManualUpdateCheck {
  if (settlement.kind === 'rejected') {
    if (isNetworkFailure(settlement.error)) return { kind: 'unreachable' };
    return { kind: 'unexpected', error: settlement.error };
  }

  const found = settlement.found;
  if (found === null) return { kind: 'up-to-date' };
  if (foundProgress(found.state) === 'download-failed') return { kind: 'download-failed' };
  return { kind: 'found', found };
}

class ShellUpdates {
  #toaster: UpdateToaster;
  #container: ShellWorkerContainer | null;
  #reload: () => void;
  #online: () => boolean;
  #waiting: ShellWorker | null = null;
  #shown: ToastId | null = null;
  #registration: ShellRegistration | null = null;

  constructor(
    toaster: UpdateToaster,
    container: ShellWorkerContainer | null,
    reload: () => void,
    online: () => boolean,
  ) {
    this.#toaster = toaster;
    this.#container = container;
    this.#reload = reload;
    this.#online = online;
  }

  watch(url: string): Promise<void> {
    if (this.#container === null) return Promise.resolve();

    return watchShellWorker(this.#container, url, (waiting) => this.offer(waiting)).then(
      (registration) => {
        this.#registration = registration;
      },
      (error: unknown) => logUnexpected('service-worker', error),
    );
  }

  recheck(): void {
    if (!this.#online()) return;

    this.#registration?.update().catch((error: unknown) => {
      if (isNetworkFailure(error)) return;
      logUnexpected('service-worker', error);
    });
  }

  async checkNow(): Promise<ManualUpdateCheck> {
    const start = checkBeforeRequest(shellCheckState(this.#registration), this.#online());
    const check = start.kind === 'answered' ? start.check : await this.#request(start.registration);
    this.#announce(check);
    return check;
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

  async #request(registration: ShellRegistration): Promise<ManualUpdateCheck> {
    try {
      await registration.update();
    } catch (error) {
      return checkAfterRequest({ kind: 'rejected', error });
    }
    return checkAfterRequest({
      kind: 'resolved',
      found: registration.installing ?? registration.waiting,
    });
  }

  #announce(check: ManualUpdateCheck): void {
    match(check)
      .with({ kind: 'up-to-date' }, () =>
        this.#say({ variant: 'success', title: UPDATE_CHECK_TITLES.upToDate }),
      )
      .with({ kind: 'found' }, ({ found }) => this.#follow(found))
      .with({ kind: 'already-waiting' }, ({ waiting }) => {
        this.#waiting = waiting;
        if (this.#shown !== null) this.#toaster.dismiss(this.#shown);
        this.#shown = this.#toaster.show({
          title: UPDATE_CHECK_TITLES.ready,
          action: { label: SHELL_UPDATE_ACTION, run: () => this.#apply() },
        });
      })
      .with({ kind: 'offline' }, () =>
        this.#say({ variant: 'warning', title: UPDATE_CHECK_TITLES.offline }),
      )
      .with({ kind: 'unreachable' }, () =>
        this.#say({ variant: 'warning', title: UPDATE_CHECK_TITLES.unreachable }),
      )
      .with({ kind: 'download-failed' }, () =>
        this.#say({ variant: 'danger', title: UPDATE_CHECK_TITLES.downloadFailed }),
      )
      .with({ kind: 'unavailable' }, () =>
        this.#say({ variant: 'info', title: UPDATE_CHECK_TITLES.unavailable }),
      )
      .with({ kind: 'unexpected' }, ({ error }) => {
        logUnexpected('service-worker', error);
        this.#say({
          variant: 'danger',
          title: UNEXPECTED_FAILURE_TITLE,
          message: describeCause(error),
        });
      })
      .exhaustive();
  }

  #say(toast: ToastOptions): void {
    this.#toaster.show(toast);
  }

  #follow(found: ShellWorker): void {
    const downloading = this.#toaster.show({
      title: UPDATE_CHECK_TITLES.downloading,
      duration: 'persistent',
    });
    let following = true;
    const settle = (): void => {
      if (!following) return;
      match(foundProgress(found.state))
        .with('downloading', () => undefined)
        .with('installed', () => {
          following = false;
          this.#toaster.dismiss(downloading);
          this.offer(found);
        })
        .with('download-failed', () => {
          following = false;
          this.#toaster.dismiss(downloading);
          this.#announce({ kind: 'download-failed' });
        })
        .exhaustive();
    };
    found.addEventListener('statechange', settle);
    settle();
  }

  #apply(): void {
    const waiting = this.#waiting;
    const container = this.#container;
    if (waiting === null || container === null) return;
    applyShellUpdate(container, waiting, this.#reload);
  }
}

function createShellUpdates(toaster: UpdateToaster): ShellUpdates {
  return new ShellUpdates(
    toaster,
    'serviceWorker' in navigator ? navigator.serviceWorker : null,
    () => location.reload(),
    () => navigator.onLine,
  );
}

function watchShellUpdates(updates: ShellUpdates): void {
  if (!('serviceWorker' in navigator)) return;

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
  UPDATE_CHECK_TITLES,
  checkAfterRequest,
  checkBeforeRequest,
  createShellUpdates,
  foundProgress,
  isNetworkFailure,
  shellCheckState,
  watchShellUpdates,
};
export type {
  FoundProgress,
  ManualUpdateCheck,
  ShellCheckState,
  UpdateCheckStart,
  UpdateSettlement,
  UpdateToaster,
};
