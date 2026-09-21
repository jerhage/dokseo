type Disposer = () => void;

type StackOwner = { DisposableStack?: unknown };

function disposerOf(value: unknown): Disposer {
  const held = value as { [Symbol.dispose]?: unknown };
  const dispose = held[Symbol.dispose];
  if (typeof dispose !== 'function') throw new TypeError('Object is not disposable.');

  return () => {
    (dispose as Disposer).call(value);
  };
}

class StackShim {
  #held: Disposer[] = [];
  #disposed = false;

  get disposed(): boolean {
    return this.#disposed;
  }

  use<T>(value: T): T {
    if (value === null || value === undefined) return value;
    this.#keep(disposerOf(value));

    return value;
  }

  adopt<T>(value: T, onDispose: (held: T) => void): T {
    this.#keep(() => {
      onDispose(value);
    });

    return value;
  }

  defer(onDispose: Disposer): void {
    this.#keep(onDispose);
  }

  move(): StackShim {
    if (this.#disposed) throw new ReferenceError('This stack is already disposed.');

    const moved = new StackShim();
    moved.#held = this.#held;
    this.#held = [];
    this.#disposed = true;

    return moved;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    const held = this.#held;
    this.#held = [];
    for (let at = held.length - 1; at >= 0; at -= 1) held[at]?.();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  #keep(disposer: Disposer): void {
    if (this.#disposed) throw new ReferenceError('This stack is already disposed.');
    this.#held.push(disposer);
  }
}

function ensureDisposableStack(owner: StackOwner): unknown {
  owner.DisposableStack ??= StackShim;

  return owner.DisposableStack;
}

export { StackShim, ensureDisposableStack };
export type { StackOwner };
