import { match } from 'ts-pattern';
import type { ShellMessage } from '$lib/platform/service-worker/shell-message';
import { isSkipWaiting } from '$lib/platform/service-worker/shell-message';
import type {
  ShellRegistration,
  ShellWorker,
  ShellWorkerContainer,
} from '$lib/platform/service-worker/shell-registration';
import {
  SHELL_UPDATE_TITLE,
  SHELL_WORKER_URL,
  ShellUpdates,
  UPDATE_CHECK_TITLES,
} from '$lib/shared/shell-updates';
import type { ManualUpdateCheck, UpdateToaster } from '$lib/shared/shell-updates';
import { UNEXPECTED_FAILURE_TITLE } from '$lib/shared/unexpected-failure';

type CheckKind = ManualUpdateCheck['kind'];

type ToastLook = 'info' | 'success' | 'warning' | 'danger';

type ExpectedToast = {
  readonly variant: ToastLook;
  readonly title: string;
  readonly reload: boolean;
};

type CheckDetail = {
  readonly when: string;
  readonly toast: ExpectedToast;
};

type CheckOutcome = CheckDetail & { readonly kind: CheckKind };

type Rehearsal = {
  readonly updates: ShellUpdates;
  readonly found: StandInWorker | null;
  readonly start: () => Promise<ManualUpdateCheck>;
};

class StandInWorker implements ShellWorker {
  state: ServiceWorkerState;
  #statechange: (() => void)[] = [];
  #onSkipWaiting: () => void;

  constructor(state: ServiceWorkerState, onSkipWaiting: () => void) {
    this.state = state;
    this.#onSkipWaiting = onSkipWaiting;
  }

  postMessage(message: ShellMessage, _transfer: Transferable[]): void {
    if (!isSkipWaiting(message)) return;
    this.become('activating');
    this.become('activated');
    this.#onSkipWaiting();
  }

  addEventListener(_kind: 'statechange', listen: () => void): void {
    this.#statechange.push(listen);
  }

  become(state: ServiceWorkerState): void {
    this.state = state;
    for (const listen of this.#statechange) listen();
  }
}

class StandInRegistration implements ShellRegistration {
  waiting: ShellWorker | null = null;
  installing: ShellWorker | null = null;
  #update: () => Promise<unknown>;
  #updatefound: (() => void)[] = [];

  constructor(update: (registration: StandInRegistration) => Promise<unknown>) {
    this.#update = () => update(this);
  }

  update(): Promise<unknown> {
    return this.#update();
  }

  addEventListener(_kind: 'updatefound', listen: () => void): void {
    this.#updatefound.push(listen);
  }

  install(worker: ShellWorker): void {
    this.installing = worker;
    for (const listen of this.#updatefound) listen();
  }
}

class StandInContainer implements ShellWorkerContainer {
  readonly controller: object = {};
  #registration: StandInRegistration;
  #controllerchange: (() => void)[] = [];

  constructor(registration: StandInRegistration) {
    this.#registration = registration;
  }

  async register(_url: string): Promise<ShellRegistration> {
    return this.#registration;
  }

  addEventListener(_kind: 'controllerchange', listen: () => void, _options: { once: true }): void {
    this.#controllerchange.push(listen);
  }

  changeController(): void {
    const listeners = this.#controllerchange;
    this.#controllerchange = [];
    for (const listen of listeners) listen();
  }
}

const STAND_IN_FAILURE = 'A stand-in failure from the docs demo';

const RELOAD_OFFER: ExpectedToast = {
  variant: 'info',
  title: SHELL_UPDATE_TITLE,
  reload: true,
};

const CHECK_DETAILS: Readonly<Record<CheckKind, CheckDetail>> = {
  'up-to-date': {
    when: 'The request finds the same service worker file.',
    toast: { variant: 'success', title: UPDATE_CHECK_TITLES.upToDate, reload: false },
  },
  found: {
    when: 'The request finds a new file and the browser starts installing it.',
    toast: { variant: 'info', title: UPDATE_CHECK_TITLES.downloading, reload: false },
  },
  'already-waiting': {
    when: 'A new version is installed and waiting before the check starts. No request is made.',
    toast: { variant: 'info', title: UPDATE_CHECK_TITLES.ready, reload: true },
  },
  offline: {
    when: 'navigator.onLine is false. No request is made.',
    toast: { variant: 'warning', title: UPDATE_CHECK_TITLES.offline, reload: false },
  },
  unreachable: {
    when: 'update() rejects with a network failure.',
    toast: { variant: 'warning', title: UPDATE_CHECK_TITLES.unreachable, reload: false },
  },
  'download-failed': {
    when: 'The new worker turns redundant, for example because one precache file failed.',
    toast: { variant: 'danger', title: UPDATE_CHECK_TITLES.downloadFailed, reload: false },
  },
  unavailable: {
    when: 'No service worker is registered: dev, an unsupported browser, or a failed registration.',
    toast: { variant: 'info', title: UPDATE_CHECK_TITLES.unavailable, reload: false },
  },
  unexpected: {
    when: 'update() rejects with anything else. The error is also logged.',
    toast: { variant: 'danger', title: UNEXPECTED_FAILURE_TITLE, reload: false },
  },
};

const CHECK_KINDS: readonly CheckKind[] = [
  'up-to-date',
  'found',
  'already-waiting',
  'offline',
  'unreachable',
  'download-failed',
  'unavailable',
  'unexpected',
];

function checkOutcomes(): readonly CheckOutcome[] {
  return CHECK_KINDS.map((kind) => ({ kind, ...CHECK_DETAILS[kind] }));
}

function updateFor(
  kind: CheckKind,
  found: StandInWorker,
): (registration: StandInRegistration) => Promise<unknown> {
  return (registration) =>
    match(kind)
      .returnType<Promise<unknown>>()
      .with('found', () => {
        registration.install(found);
        return Promise.resolve(registration);
      })
      .with('download-failed', () => {
        found.state = 'redundant';
        registration.installing = found;
        return Promise.resolve(registration);
      })
      .with('unreachable', () => Promise.reject(new TypeError('Failed to fetch')))
      .with('unexpected', () => Promise.reject(new Error(STAND_IN_FAILURE)))
      .with('up-to-date', 'already-waiting', 'offline', 'unavailable', () =>
        Promise.resolve(registration),
      )
      .exhaustive();
}

function rehearse(kind: CheckKind, toaster: UpdateToaster, reload: () => void): Rehearsal {
  let container: StandInContainer | null = null;
  const found = new StandInWorker('installing', () => container?.changeController());
  const registration = new StandInRegistration(updateFor(kind, found));
  container = new StandInContainer(registration);
  if (kind === 'already-waiting') {
    found.state = 'installed';
    registration.waiting = found;
  }

  const updates = new ShellUpdates(
    toaster,
    kind === 'unavailable' ? null : container,
    reload,
    () => kind !== 'offline',
  );

  return {
    updates,
    found: kind === 'found' ? found : null,
    start: async () => {
      await updates.watch(SHELL_WORKER_URL);
      return updates.checkNow();
    },
  };
}

export {
  CHECK_DETAILS,
  CHECK_KINDS,
  RELOAD_OFFER,
  STAND_IN_FAILURE,
  StandInWorker,
  checkOutcomes,
  rehearse,
};
export type { CheckDetail, CheckKind, CheckOutcome, ExpectedToast, Rehearsal, ToastLook };
