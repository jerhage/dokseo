import { SKIP_WAITING } from './shell-message';
import type { ShellMessage } from './shell-message';

type ShellWorker = {
  readonly state: ServiceWorkerState;
  postMessage(message: ShellMessage, transfer: Transferable[]): void;
  addEventListener(kind: 'statechange', listen: () => void): void;
};

type ShellRegistration = {
  readonly waiting: ShellWorker | null;
  update(): Promise<unknown>;
  readonly installing: ShellWorker | null;
  addEventListener(kind: 'updatefound', listen: () => void): void;
};

type ShellWorkerContainer = {
  readonly controller: object | null;
  register(url: string): Promise<ShellRegistration>;
  addEventListener(kind: 'controllerchange', listen: () => void, options: { once: true }): void;
};

async function watchShellWorker(
  container: ShellWorkerContainer,
  url: string,
  onWaiting: (waiting: ShellWorker) => void,
): Promise<ShellRegistration> {
  const registration = await container.register(url);

  const offer = (worker: ShellWorker): void => {
    if (container.controller !== null) onWaiting(worker);
  };

  if (registration.waiting !== null) offer(registration.waiting);

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (installing === null) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') offer(installing);
    });
  });

  return registration;
}

function applyShellUpdate(
  container: ShellWorkerContainer,
  waiting: ShellWorker,
  reload: () => void,
): void {
  if (waiting.state !== 'installed') {
    reload();
    return;
  }

  container.addEventListener('controllerchange', () => reload(), { once: true });
  waiting.postMessage(SKIP_WAITING, []);
}

export { applyShellUpdate, watchShellWorker };
export type { ShellRegistration, ShellWorker, ShellWorkerContainer };
