class OperationClock {
  #current = 0;

  get current(): number {
    return this.#current;
  }

  next(): number {
    this.#current += 1;
    return this.#current;
  }
}

export { OperationClock };
