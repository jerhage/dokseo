import type { ShellMessage } from '$lib/platform/service-worker/shell-message';
import type {
  ShellRegistration,
  ShellWorker,
  ShellWorkerContainer,
} from '$lib/platform/service-worker/shell-registration';

class FakeShellWorker implements ShellWorker {
  state: ServiceWorkerState;
  readonly posted: ShellMessage[] = [];
  #statechange: (() => void)[] = [];

  constructor(state: ServiceWorkerState) {
    this.state = state;
  }

  postMessage(message: ShellMessage, _transfer: Transferable[]): void {
    this.posted.push(message);
  }

  addEventListener(_kind: 'statechange', listen: () => void): void {
    this.#statechange.push(listen);
  }

  become(state: ServiceWorkerState): void {
    this.state = state;
    for (const listen of this.#statechange) listen();
  }
}

class FakeShellRegistration implements ShellRegistration {
  waiting: FakeShellWorker | null = null;
  installing: FakeShellWorker | null = null;
  updates = 0;
  updateFailure: unknown = undefined;
  updateFinds: FakeShellWorker | null = null;
  #updatefound: (() => void)[] = [];

  update(): Promise<void> {
    this.updates += 1;
    if (this.updateFailure !== undefined) return Promise.reject(this.updateFailure);
    if (this.updateFinds !== null) this.install(this.updateFinds);
    return Promise.resolve();
  }

  addEventListener(_kind: 'updatefound', listen: () => void): void {
    this.#updatefound.push(listen);
  }

  install(worker: FakeShellWorker): void {
    this.installing = worker;
    for (const listen of this.#updatefound) listen();
  }
}

class FakeShellContainer implements ShellWorkerContainer {
  controller: object | null;
  readonly registration = new FakeShellRegistration();
  readonly registered: string[] = [];
  #controllerchange: (() => void)[] = [];
  #failure: unknown;

  constructor(controlled: boolean, failure: unknown = undefined) {
    this.controller = controlled ? {} : null;
    this.#failure = failure;
  }

  async register(url: string): Promise<ShellRegistration> {
    this.registered.push(url);
    if (this.#failure !== undefined) throw this.#failure;
    return this.registration;
  }

  addEventListener(_kind: 'controllerchange', listen: () => void, options: { once: true }): void {
    const wrapped = (): void => {
      if (options.once)
        this.#controllerchange = this.#controllerchange.filter((l) => l !== wrapped);
      listen();
    };
    this.#controllerchange.push(wrapped);
  }

  changeController(): void {
    this.controller = {};
    for (const listen of this.#controllerchange) listen();
  }
}

export { FakeShellContainer, FakeShellRegistration, FakeShellWorker };
