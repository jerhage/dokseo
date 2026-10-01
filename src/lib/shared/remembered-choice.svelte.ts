class RememberedChoice<T> {
  #chosen: T;
  #save: (value: T) => void;

  constructor(read: () => T, save: (value: T) => void) {
    this.#chosen = $state.raw(read());
    this.#save = save;
  }

  get value(): T {
    return this.#chosen;
  }

  choose(next: T): void {
    this.#chosen = next;
    this.#save(next);
  }
}

export { RememberedChoice };
